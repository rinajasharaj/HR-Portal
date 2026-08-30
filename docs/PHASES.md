# Project Phases — AI-Assisted Architecture Analysis for Enterprise Frontend Applications

This document explains every phase of the thesis project: **what** it produced, **why** it was
needed, and **how** it was done. It covers the phases completed before this documentation was
written (1–11, 14, 15) and the phases still open (12, 13, 16), with ready-to-use agent prompts
for finishing the open ones.

> Companion documents:
> - `docs/REPOSITORY.md` — file-by-file reference for the whole repository.
> - `docs/THESIS-GUIDE.md` — a shorter, presentation-oriented guide written for the thesis mentor.

---

## 0. Thesis context

**Title:** *AI-Assisted Architecture Analysis for Enterprise Frontend Applications*

**Core idea:** a tool that analyses an Nx monorepo's architecture and uses a Large Language Model
(LLM) to *explain* problems that deterministic code has already *detected*. The AI never decides
whether something is a problem — it only turns a machine-found fact into a human explanation.

**The one rule that governs the whole design:** **"AI explains, never detects."**
Every phase respects it.

**Research questions:**

| RQ | Question |
|----|----------|
| RQ1 | What architectural information can be *deterministically* extracted from an enterprise frontend project (Nx graph, tags, dependency edges, source exports)? |
| RQ2 | How should evidence and prompt structure be designed so the LLM stays grounded in facts and does not hallucinate? |
| RQ3 | What additional value does the AI explanation layer add on top of the deterministic findings alone? |
| RQ4 | How can the quality of the AI's recommendations be evaluated? |

**Two repositories, one Git repo (`HR-Portal`):**

| Folder | Role |
|--------|------|
| `employeer-management-portal/` | The **case-study application** — a realistic Nx + Angular monorepo used as the object of analysis. |
| `architecture-analyzer/` | The **thesis deliverable** — the analysis tool itself (Node/TypeScript). |

**The experiment structure** — three frozen states of the case-study app, captured as Git tags
and as Nx graph snapshots:

| State | Git tag | Meaning |
|-------|---------|---------|
| T0 | `t0-start` | Clean, well-structured architecture. |
| T1 | `t1-eroded` | Four deliberate architectural problems injected. |
| T2 | `t2-restructured` | Problems fixed, then split into micro-frontends. |
| T3 | `t3-boundary-violation-catch` | A live violation introduced during development and caught by the tool. |

---

## Phase 1 — Clean baseline architecture (T0)

**What it produced**

- An Nx workspace (`employeer-management-portal`) using Angular and the esbuild-based
  `@angular/build` builder.
- **13 libraries** across four domains, each domain following the same four-layer pattern:

  | Layer (`type:` tag) | Responsibility |
  |---------------------|----------------|
  | `domain-api` | The public entry point of a domain — the *only* door other domains may use. |
  | `feature` | Smart components / pages. |
  | `data-access` | Services and state. |
  | `ui` | Small presentational components. |

  Domains: `employees`, `leave`, `time` (three business domains) + `shared` (only `shared-ui`).
- Every library tagged with `domain:<name>` and `type:<name>`.
- Nx module-boundary lint rules (`@nx/enforce-module-boundaries`) with `depConstraints`:
  - **domain rule** — a library may only depend on its own domain or `domain:shared`;
  - **type rule** — a `feature` may use `feature`/`data-access`/`ui`/`domain-api`; a `ui` may
    only use `ui`; a `data-access` may use `data-access`/`ui`/`domain-api`.
- Enforcement was verified by writing an illegal cross-domain import, watching lint fail, then
  removing it.

**Why**

The thesis needs a *believable* "before" picture: a codebase that looks like real enterprise
frontend work (domain-driven, layered, boundary-enforced), so that later erosion and detection
are meaningful rather than toy examples. It also directly feeds **RQ1** — the tags and the
constraint rules are exactly the deterministic signal the analyzer later reads.

**How**

`nx` generators created the apps and libraries; `project.json` `tags` arrays were filled in per
library; `eslint.config.mjs` at the workspace root received the `depConstraints` block. Tagged
`t0-start`.

---

## Phase 2 — Deliberate architectural erosion (T1)

**What it produced**

Four known problems, each committed separately with a realistic-sounding message:

| # | Problem type | What was done |
|---|--------------|---------------|
| 1 | **Boundary violation** | `leave-feature` imports `employees-data-access` directly, bypassing `employees-domain-api`. |
| 2 | **God library** | `shared-ui` given three unrelated exports: a generic button (fine), a date utility (borderline), and a `leave-status-badge` (domain-specific code that does not belong in a shared library). |
| 3 | **Circular dependency** | `leave-feature` → `time-feature` → `leave-domain-api`, creating a `leave ↔ time` cycle at domain level. |
| 4 | **Untagged libraries** | `domain:`/`type:` tags removed from `shared-ui` and `time-ui`. |

**Why**

These four are the **ground truth** for evaluating the detectors. Because we injected them
deliberately, we know exactly what the tool *should* find in T1 and *should not* find in T0.
This is the test data for **RQ1** and the baseline for **RQ3** (does the AI layer add value on
top of "we found 4 things").

**How**

Manual edits to imports, `index.ts` export lists, and `project.json` tag arrays. Verified
visually with `nx graph` (the interactive dependency-graph view), which showed the cycle and the
cross-domain arrow. Tagged `t1-eroded`.

---

## Phase 3 — Deterministic detection engine

**What it produced**

Four detectors that read the Nx project graph JSON (`nx graph --file=graph-output.json`) and
report findings with **zero AI involvement**:

| Detector | Logic |
|----------|-------|
| **Boundary violation** | For every dependency edge, read the `domain:` and `type:` tags of source and target. Flag it when: source and target are in different domains, the target is not `domain:shared`, and the target's type is not `domain-api`. |
| **Circular dependency** | Collapse the library graph to a domain-level graph, then look for any pair of domains that point at each other in both directions. |
| **Untagged library** | Flag any node of type `lib` whose `tags` array is empty. |
| **God library** | For each library, read its `index.ts`, collect `export` lines, and flag the library if an export line mentions a *known business domain name* other than the library's own domain. |

The god-library detector was iterated:
- **v1 (rejected):** count `export` lines; flag above a threshold. Rejected because export
  *count* says nothing about whether the exports belong together.
- **v2 (kept):** the mixed-domain-name check above — more explainable, far fewer false positives.

**Why**

This is the heart of **RQ1**: everything the tool "knows" must come from deterministic analysis
of extractable facts. The detectors are intentionally simple and readable so their output can be
trusted and explained in the thesis.

**How**

TypeScript scripts run with `tsx`. Early exploratory versions live in the repo as
`read-graph.ts` and `evidence-packages.ts`; the production version of the logic ended up in
`run-analysis.ts` (and later `detectors.ts`).

---

## Phase 4 — AI-grounded explanation layer

**What it produced**

A pipeline that turns each deterministic finding into a grounded, structured explanation:

1. **Evidence package** — each finding becomes a plain object containing only verified facts
   (source, target, domains, types, the violated rule). No AI yet.
2. **LLM call** — the evidence is sent to OpenAI (`gpt-4o-mini`) via `chat.completions.create`,
   with a system prompt: *"Only use the facts given to you. Never invent details."*
3. **Structured outputs** — `response_format: { type: 'json_schema', strict: true }` forces the
   model to return exactly three fields: `explanation`, `consequences`, `recommendedFix`.
4. **Validator** — scans the model's response text for any workspace library name that was *not*
   in the evidence package. Any such mention is recorded as a `validationWarning` (a possible
   ungrounded claim).
5. **Pipeline** — `runAnalysis(graphPath)` runs all detectors, loops over every finding, calls
   the LLM, validates, and returns an array of
   `{ evidence, aiExplanation, validationWarnings }`.

**Why**

This is **RQ2** in code. The evidence-package + JSON-schema + validator combination is the
concrete mechanism for keeping the LLM grounded, and the `validationWarnings` array is the
measurable signal for whether it worked.

**How**

`ai-explains.ts` was the first single-finding prototype. The full loop and the validator live in
`run-analysis.ts`. Each run is also written to a timestamped `analysis-run-*.json` file for the
record.

---

## Phase 5 — Applying the recommendations + micro-frontend restructuring (T2)

**What it produced**

- **Fixes**, applied from the AI's own `recommendedFix` text:
  1. removed the `employees-data-access` import from `leave-feature`;
  2. removed the `time-feature` import from `leave-feature` (this single change also broke the
     cycle — the same import caused both problems);
  3. re-added tags to `shared-ui` and `time-ui`;
  4. moved `leave-status-badge` from `shared-ui` into `leave-ui`.
  Re-ran detectors → zero findings. Tagged `t1-fixed`.
- **Micro-frontend split** using `@angular-architects/native-federation`:
  - `employeer-management-portal` became the **host / shell**;
  - two new apps became **remotes**: `employees` (port 4201), `leave` (port 4202);
  - `time` was deliberately *kept inside the shell* — two remotes is enough to demonstrate the
    pattern.
  - Wired via each app's `federation.config.mjs` (`remotes` / `exposes`) and lazy
    `loadRemoteModule` routes in the shell.
  - Tagged `t2-restructured`.

**Why**

- Fixing the issues proves the findings are **actionable** (feeds **RQ3**).
- The micro-frontend split makes the case-study app resemble a real large-scale enterprise
  frontend, and it stress-tests the analyzer against a more complex build setup.

**How (and a known gotcha)**

Native Federation's `shareAll({ requiredVersion: 'auto' })` requires `@angular/core` to appear
under `dependencies` (not only `devDependencies`) in each app's `package.json`. Missing that
caused a build failure that had to be fixed by hand in all three apps.

---

## Phase 6 — Analysis-tool UI

**What it produced**

- `run-analysis.ts` refactored into a reusable exported `runAnalysis(graphPath)` function.
- Three frozen graph snapshots, one per tag: `graph-output-t0.json`, `graph-output-t1.json`,
  `graph-output-t2.json` (generated by checking out each tag and running `nx graph --file=...`).
- A small **Express server** (`server.ts`) exposing `GET /analyze/:state` (`t0` / `t1` / `t2`),
  each mapped to its snapshot file.
- A minimal Angular app, **`analyzer-ui`**, with three buttons (one per state) that call the API
  and list the findings with their AI explanations.

**Why**

A UI makes the tool demonstrable without a terminal, and the three-button layout mirrors the
T0/T1/T2 experiment structure directly — useful for the thesis Evaluation chapter and for the
mentor demo.

**How**

Express 5 + `cors`; the Angular app generated with Nx, using `HttpClient`.

---

## Phase 7 — Shared UI component library (Taiga UI)

**What it produced**

Taiga UI (`@taiga-ui/core`, `cdk`, `kit`, `layout`, `addon-table`) installed, and six
standalone, signal-based components built in `shared-ui`:

| Component | Wraps | Notes |
|-----------|-------|-------|
| `Button` (`ButtonComponent`) | `tuiButton` | `variant` input (`primary` / `secondary` / `floating`). |
| `Input` (imported elsewhere as `LibInput`) | `tuiTextfield` | Two-way binding via `model()`. |
| `Card` | `tuiCardLarge` | Optional `title` input. |
| `Table` | `tuiTable` + `tuiPagination` | Tracks `currentPage`/`totalPages`; does **not** slice data itself — the consumer does. |
| `AppShell` / `Shell` | sidebar + `TuiBreadcrumbs` + `<router-outlet />` | `NavItem` model in its own file. |
| (`Badge` was planned; the equivalent ended up as the domain-specific `leave-status-badge`.) |

**Why**

A realistic enterprise frontend uses a design-system library. It also creates the raw material
for the **god-library** scenario (a shared library that could accumulate domain-specific code).

**How (known gotcha)**

Taiga v5's theme file is a `.less` file at
`@taiga-ui/styles/taiga-ui-theme.less` — it **cannot** be `@import`-ed from SCSS. It must be
added directly to the `styles` array of each app's build target in `project.json`, with a `./`
prefix, plus the icon SVGs copied via an `assets` entry. This had to be repeated in each app
because Native Federation builds each app independently.

---

## Phase 8 — Real features per domain

**What it produced** — working features (not just placeholders), all standalone + signals, all
control-flow using `@if`/`@for`, all interfaces in domain `domain-api` model files:

- **Employees:** `EmployeeList` (table + department filter + pagination), `EmployeeProfile`
  (details + manager lookup), `EmployeeEditForm`, `OrgChart` (recursive manager→reports tree).
- **Leave:** `MyLeaveRequests`, `LeaveRequestForm`, `LeaveApprovalQueue` (manager-only,
  approve/reject), `LeaveBalanceView` (entitlement vs used).
- **Time:** `WeeklyTimesheet` (editable hours + computed total), `ClockInOut` (toggle),
  `TimeHistory` (past weeks).
- Mock data lives in each domain's `data-access` store (`EmployeesStore`, `LeaveStore`,
  `TimeStore`).

**Why**

Real features produce a real dependency graph. Empty components would not exercise the module
boundaries the analyzer inspects, and would make the demo unconvincing.

**How**

Nx component generators; data held in `signal()`s inside the stores; cross-cutting "who am I"
handled by `CurrentUserService` in `shared-ui` (with an employee/manager role toggle).

---

## Phase 9 — Cross-domain dashboard

**What it produced**

A `Dashboard` component **in the shell** (`apps/employeer-management-portal/src/app/dashboard/`)
showing employee count, pending leave, hours this week, upcoming leave, a recent-activity feed,
and quick-action links.

The architecturally important part: the dashboard reads cross-domain data **only through each
domain's `domain-api` facade** (`EmployeesFacade`, `LeaveFacade`, `TimeFacade` — abstract
classes implemented by the domain stores and wired with `provide<Domain>Data()` in the shell's
`app.config.ts`). It never touches `data-access` or `feature` directly.

**Why**

The dashboard is the deliberate *positive* example — "this is how cross-domain reads should look"
— set against the Phase 2 boundary violation. It shows the analyzer distinguishes correct
cross-domain use (via `domain-api`) from incorrect (via internals).

**How**

Abstract-class facades in `domain-api`; `{ provide: EmployeesFacade, useExisting: EmployeesStore }`
providers; `computed()` values in the dashboard reading facade signals.

> A wiring pass after Phase 9 added the shell routes, the role-aware navigation, and resolved all
> the Taiga styling issues across the three apps.

---

## Phase 10 — Catching a live rule violation

**What it produced**

The "the tool catches me in the act" scenario. During feature development, a realistic shortcut
was taken: `employees-feature` imports `LeaveStatusBadgeComponent` from `leave-ui`
(`domain:employees` → `domain:leave`, into a `ui` layer, not `domain-api`). The graph was
regenerated and the analyzer flagged it, with a grounded AI explanation.

This violation is **kept in the codebase on purpose** — it is the standing example the
pre-push hook and CI check are calibrated against (it is in the baseline; see Phase 14).
Tagged `t3-boundary-violation-catch`.

**Why**

Phases 2–5 show the tool on *frozen historical* states. Phase 10 shows it working on *live,
in-progress* code — which is how it would actually be used. This is a direct demonstration of
**RQ1/RQ3** in a development workflow.

**How**

1. `cd employeer-management-portal && npx nx graph --file=graph-output.json` — regenerate the
   live graph.
2. `cd architecture-analyzer && npx tsx read-graph.ts` — quick, AI-free confirmation the
   boundary detector sees the new edge.
3. `npx tsx run-analysis.ts` — full run with AI explanation + validation; result stored.

The badge component carries a code comment marking it as a deliberate study-case violation.

---

## Phase 11 — Database persistence + one-click analysis

**What it produced**

1. **`db.ts`** — persistence using Node's **built-in** `node:sqlite` (no native dependency;
   `better-sqlite3` was considered but not needed). One table:

   ```
   analysis_runs(id, created_at, graph_path, finding_count, results_json)
   ```

   Helpers: `saveRun()`, `getAllRuns()` (list without the big blob), `getRunById()` (full run).
   The DB file `analysis-history.db` is git-ignored.
2. **`runAnalysis()`** now calls `saveRun()` at the end — every run is persisted automatically.
3. **New endpoints** in `server.ts`:
   - `GET /runs` — run history (newest first);
   - `GET /runs/:id` — one full run, with `results_json` parsed back to JSON.
4. **`GET /analyze/live`** — regenerates the Nx graph (`execSync('npx nx graph …')`) *and*
   runs the analysis *and* saves it, in a single HTTP call. This removed the manual two-step
   terminal dance.
5. **`analyzer-ui` upgrade** — added an "Analyze current code" button calling `/analyze/live`;
   added the missing `provideHttpClient()`; modernised to `@if`/`@for`, `inject()`, signals;
   pulled `Card` and `Button` from `shared-ui` into the analyzer UI and wired Taiga's theme into
   its build; findings now render as Taiga cards showing explanation / consequences / fix and a
   validation-warning count.
6. Local model file `apps/analyzer-ui/src/app/models/analysis-item.model.ts` for the response
   shape (no inline interfaces in components).

**Why**

- Persistence (**RQ4**) is the foundation for evaluating recommendation quality over time and
  for the comparison/trend work in Phases 12–13.
- The one-click flow makes the tool usable in practice and demo-able in one gesture.

**How**

`node:sqlite`'s `DatabaseSync` with prepared statements; `child_process.execSync` to shell out
to `nx graph`; Angular `HttpClient` with an error branch so a dead backend shows a message
instead of hanging.

> **Note — god-library detector limitation (accepted).** The god-library detector reads
> `index.ts` files from the *current working tree*, not from the historical snapshot. So when
> analysing T0/T1/T2 it reflects *today's* source, not the source at that tag. The other three
> detectors read the frozen graph JSON and are correct per state. This is documented as a known
> limitation and is itself an **RQ1** finding: some architectural facts live in the graph, others
> only in source, and snapshots capture only the former.

---

## Phase 14 — Local git hook (pre-push gate)

**What it produced**

- A root **`package.json`** (`hr-portal-workspace`, private) to host tooling.
- **Husky** installed; `core.hooksPath` pointed at `.husky/`.
- **`detectors.ts`** — the four detectors extracted into a standalone, AI-free
  `detectFindings(graphPath)` function (this is the piece Phase 12 was meant to build; it was
  created here because the hook needs it).
- **`check-architecture.ts`** — the gate:
  - regenerates the graph, runs `detectFindings`, converts each finding to a short **signature**
    string (e.g. `boundary-violation | employees-feature -> leave-ui`);
  - compares the current signatures against **`architecture-baseline.json`**
    (`{ generatedAt, acceptedFindings: [...] }`);
  - `--update-baseline` mode writes the current set as the accepted baseline;
  - default mode: any signature *not* in the baseline → prints it and exits non-zero;
  - also reports baseline findings that have disappeared (so you know to refresh the baseline).
- **`.husky/pre-push`** → `cd architecture-analyzer && npx tsx check-architecture.ts`.
- Baseline generated with one accepted finding: the Phase 10 `employees-feature -> leave-ui`
  violation.

**Why**

This is the "ratchet": known issues are allowed, but the architecture can never get *worse*
without someone explicitly accepting it. It demonstrates the analyzer as a **workflow gate**, not
just a report generator.

**How**

`git push` runs `.husky/pre-push` from the repo root; the script exits non-zero to abort the
push. Verified by adding a second violation (`leave-feature` → `employees-data-access`), watching
the hook block, then reverting.

---

## Phase 15 — GitHub Actions CI + required check

**What it produced**

- **`.github/workflows/architecture-check.yml`** — a workflow that:
  - triggers on `pull_request` (and currently also `push` to `main` — see cleanup item C4);
  - checks out the repo, sets up Node 22;
  - runs `npm ci` in both `architecture-analyzer/` and `employeer-management-portal/`;
  - runs `npx tsx check-architecture.ts`.
  No API key / secret needed — the CI gate is deterministic-only (no LLM call).
- Repository made **public** (branch protection / rulesets are not enforced on private repos on
  a free personal plan).
- A **ruleset** ("main protection", Active) on `main` requiring the **architecture** status
  check to pass before a PR can merge.
- **End-to-end demo** (kept as a permanently-open PR): a branch introducing
  `leave-feature → employees-data-access`, pushed with `--no-verify` to bypass the local hook,
  opened as a PR → the CI check fails and the merge button is disabled.

**Why**

The local hook can be skipped (`--no-verify`). CI is the server-side backstop that *cannot* be
skipped once the check is required. Together they show a complete, layered enforcement story for
the thesis.

**How**

Standard GitHub Actions YAML; `NX_DAEMON: false` keeps Nx simple in CI.

---

# Open phases — future work

These were planned in the original handoff and are **not implemented**. Each entry below has a
short spec and a ready-to-paste prompt for an AI coding assistant. The agreed build order is
**12 → 13 → 16**.

---

## Phase 12 — Comparison view *(skipped, revisit)*

**Goal.** A page in `analyzer-ui` showing a table: findings per detector type per state
(T0 / T1 / T2) side by side. This is the main Evaluation-chapter figure.

**Spec.**
- Backend: a `GET /compare` endpoint that runs `detectFindings()` (AI-free) on the three
  snapshot files and returns a count matrix:
  `[{ detector, t0, t1, t2 }, …]` for the four detector types.
- Frontend: a second route/page in `analyzer-ui` rendering the matrix as a table.
- Remember the accepted **god-library limitation** — it will read 0 for historical states.
  Either show it with a footnote, or exclude it from this particular figure.
- `detectFindings()` already exists in `architecture-analyzer/detectors.ts`.

**Known real numbers today** (for verifying the implementation): T0 = 0 findings;
T1 = 2 boundary + 2 untagged + 1 circular; T2 = 0 findings.

**Agent prompt:**

> In `architecture-analyzer/server.ts`, add a `GET /compare` endpoint. It should call
> `detectFindings()` from `./detectors` once for each of
> `../employeer-management-portal/graph-output-t0.json`, `-t1.json`, `-t2.json`, then return a
> JSON array with one row per detector type
> (`boundary-violation`, `circular-dependency`, `untagged-library`, `god-library`) shaped
> `{ detector, t0, t1, t2 }` where each state value is the count of findings of that type.
> Do not call the LLM. Then, in `employeer-management-portal/apps/analyzer-ui`, add a second
> route `/compare` with a new standalone component that fetches `http://localhost:3000/compare`
> and renders the matrix as a table using the shared-ui `Card` and a plain `<table>`. Add a nav
> link between the home view and the compare view. Put the response interface in a model file
> under `apps/analyzer-ui/src/app/models/`. Follow the existing Angular style: standalone,
> signals, `inject()`, `@if`/`@for`. Add a short note in the UI that the god-library row reflects
> current source, not the historical snapshot. Work one file at a time and give me the full file
> contents to paste myself.

---

## Phase 13 — Severity levels + trend tracking *(skipped, revisit)*

**Goal.** Assign `high` / `medium` / `low` severity per finding type, and use the Phase 11 run
history to show whether the architecture is improving or degrading over time.

**Spec.**
- Add a severity map (probably in `architecture-rules.json` once Phase 16 lands, or a constant
  for now): e.g. `circular-dependency: high`, `boundary-violation: high`,
  `god-library: medium`, `untagged-library: low`.
- Attach `severity` to each finding in `detectFindings()` / the evidence package.
- `GET /trend` endpoint: read `analysis_runs` ordered by `created_at`, return per-run totals
  (optionally weighted by severity) so a line/bar chart can be drawn.
- `analyzer-ui`: show severity as a coloured tag on each finding; add a small trend chart page.

**Agent prompt:**

> Add finding severity and trend tracking to the architecture-analyzer.
> (1) Define a severity per finding type: `circular-dependency` and `boundary-violation` = high,
> `god-library` = medium, `untagged-library` = low. If Phase 16's `architecture-rules.json`
> exists, read it from there; otherwise use a constant in `detectors.ts`. Add a `severity` field
> to every finding object returned by `detectFindings()`.
> (2) In `server.ts` add `GET /trend`: read all rows from the `analysis_runs` table (see
> `db.ts`) ordered by `created_at` ascending, and return
> `[{ runId, createdAt, findingCount, weightedScore }]` where `weightedScore` sums
> high=3/medium=2/low=1 across that run's findings (parse `results_json`).
> (3) In `analyzer-ui`, render each finding's severity as a coloured badge, and add a `/trend`
> page with a simple bar chart (plain SVG or divs, no chart library) of `weightedScore` per run.
> Keep the deterministic-only rule: no LLM calls in any of this. Work one file at a time and give
> me full files to paste.

---

## Phase 16 — Configurable rules *(not started — branch `phase-16` exists but is empty)*

**Goal.** Move workspace-specific hardcoded values out of the detector code into a single
`architecture-rules.json`, so the analyzer is not tied to *this* repo.

**Currently hardcoded (in `detectors.ts` and the duplicate copy in `run-analysis.ts`):**

| Value | Current hardcoding |
|-------|--------------------|
| Known business domains | `['employees', 'leave', 'time']` |
| Shared-domain name | the literal `'shared'` in `targetDomain !== 'shared'` |
| Public-API type | the literal `'domain-api'` |
| Path to the Nx workspace | `'../employeer-management-portal'` (in several files) |

**Spec.**
- `architecture-rules.json` with: `workspacePath`, `sharedDomain`, `publicApiType`,
  `domains: string[]`, and a `rules` object of per-detector on/off booleans.
- `config.ts` exporting `loadRules()` — reads the JSON once, merges over defaults, caches,
  warns (not crashes) if the file is missing.
- `detectors.ts` reads every value from `loadRules()`; each detector wrapped in
  `if (rules.rules.<name>)`.
- `check-architecture.ts` and `server.ts` derive the workspace path and snapshot paths from
  `loadRules().workspacePath` instead of string literals.
- **Also fold in cleanup C1 + C2**: point `run-analysis.ts` at
  `${workspacePath}/graph-output.json` and make it call `detectFindings()` from `detectors.ts`
  instead of keeping its own copy of the four detectors.

**Agent prompt:**

> Implement Phase 16 (configurable rules) for the architecture-analyzer, and while doing it,
> remove the detector-logic duplication.
> (1) Create `architecture-analyzer/architecture-rules.json` with keys `workspacePath`
> (`"../employeer-management-portal"`), `sharedDomain` (`"shared"`), `publicApiType`
> (`"domain-api"`), `domains` (`["employees","leave","time"]`), and `rules` (an object with
> `boundaryViolation`, `circularDependency`, `untaggedLibrary`, `godLibrary` all `true`).
> (2) Create `architecture-analyzer/config.ts` exporting an `ArchitectureRules` interface and a
> cached `loadRules(configPath?)` that reads the JSON, merges it over sensible defaults, and
> `console.warn`s instead of throwing if the file is missing.
> (3) Rewrite `architecture-analyzer/detectors.ts` so every hardcoded value comes from
> `loadRules()`, the god-library index path uses `join(rules.workspacePath, sourceRoot,
> 'index.ts')`, and each of the four detectors is guarded by its `rules.rules.<name>` toggle.
> (4) Rewrite `architecture-analyzer/run-analysis.ts` to delete its inline detector code and call
> `detectFindings(graphPath)` from `./detectors`; fix the bottom `require.main` block to use
> `` `${loadRules().workspacePath}/graph-output.json` `` (it currently points at a stray
> `graph-output-03.json`).
> (5) Update `check-architecture.ts` and `server.ts` to build all workspace paths from
> `loadRules().workspacePath`.
> Verify with `npx tsx check-architecture.ts` (should still report exactly one accepted
> finding) and by curling `/analyze/live`, `/analyze/t1`, `/runs`. Work one file at a time and
> give me full files to paste myself.

---

# Outstanding cleanup items

Small inconsistencies present in the repository at the time this document was written. None
break the working features; fix them before the final thesis submission.

| ID | Item | Where | Fix |
|----|------|-------|-----|
| C1 | `run-analysis.ts` points its `require.main` run at a stray `graph-output-03.json` | `architecture-analyzer/run-analysis.ts` (bottom) | Change to `graph-output.json` (done automatically by the Phase 16 prompt). |
| C2 | The four detectors are duplicated: full copy in `run-analysis.ts`, standalone copy in `detectors.ts` | `architecture-analyzer/` | Make `run-analysis.ts` import `detectFindings` from `detectors.ts` (Phase 16 prompt does this). |
| C3 | `graph-output-03.json` is a stray tracked snapshot with no defined role | `employeer-management-portal/` | Delete it, or rename it to a proper `graph-output-t3.json` if it is meant to represent the T3 state. Also update `read-graph.ts`, which reads it. |
| C4 | CI workflow still triggers on `push: [main]` although the decision was PR-only | `.github/workflows/architecture-check.yml` | Change `on:` to just `pull_request:`. |
| C5 | Currently on branch `phase-16` (no commits); all recent work is on `main` | git | Either start Phase 16 on this branch, or `git checkout main` and delete `phase-16`. |
| C6 | `DEVELOPMENT-LOG.md` stops at Phase 6 and says "all 6 phases complete" | repo root | Either extend it through Phase 15, or replace it with a pointer to `docs/PHASES.md`. |
| C7 | `architecture-analyzer/README.md` is outdated (wrong run command, only mentions `/analyze/:state`) | `architecture-analyzer/README.md` | Update run instructions and endpoint list to match `server.ts`. |
| C8 | Exploratory scripts still in the repo: `read-graph.ts`, `evidence-packages.ts`, `ai-explains.ts`. `evidence-packages.ts` reads a non-existent `../hr-portal-web/graph-output.json` and is dead. | `architecture-analyzer/` | Move them to an `exploration/` or `archive/` folder, or delete `evidence-packages.ts`; keep `read-graph.ts` if still used for quick checks. |
| C9 | Timestamped `analysis-run-*.json` files are committed | `architecture-analyzer/` | Add `analysis-run-*.json` to `.gitignore` and remove the tracked ones, or keep a single representative one on purpose and ignore the rest. |
| C10 | `.idea/` and `.claude/` folders are committed | repo root + subfolders | `git rm -r --cached` them and add to `.gitignore` (tidiness only; nothing sensitive). |
| C11 | One historical commit contains `node_modules/` | git history | Optional; only matters for clone size. Would require `git filter-repo`. |
| C12 | `analyzer-ui` model uses `findingType: string` while the backend has a specific union type | `apps/analyzer-ui/src/app/models/analysis-item.model.ts` | Tighten to the union for consistency (cosmetic). |
