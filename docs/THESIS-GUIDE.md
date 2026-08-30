# Thesis Guide — AI-Assisted Architecture Analysis for Enterprise Frontend Applications

*Prepared for the thesis mentor. This document explains what was built, how it works, how it was
developed, and how to run and evaluate it. It is meant to be read top to bottom and followed
hands-on.*

---

## 1. One-paragraph summary

This thesis builds a tool that analyses the architecture of an enterprise frontend project (an
**Nx monorepo**) and uses a Large Language Model to **explain** the architectural problems that a
deterministic analysis has already **found**. The guiding principle is
**"AI explains, never detects"**: the LLM never decides whether something is a problem — it only
turns a machine-verified fact into a readable explanation, and every explanation is
automatically checked for claims that were not in the input. The tool is demonstrated on a
purpose-built case-study application that is deliberately eroded, then repaired, then wired into
a Git hook and a CI pipeline so that architectural regressions are blocked automatically.

---

## 2. Research questions and where they are answered

| RQ | Question | Where it is addressed in the artefact |
|----|----------|----------------------------------------|
| **RQ1** | What architectural information can be *deterministically* extracted from an enterprise frontend project? | `architecture-analyzer/detectors.ts` — four detectors reading the Nx project graph (domain/type tags, dependency edges) and library source exports. The accepted **god-library limitation** (some facts live only in source, not the graph) is itself an RQ1 result. |
| **RQ2** | How should evidence and prompts be structured so the LLM stays grounded? | `run-analysis.ts` — the *evidence package* (facts only), a constraining system prompt, OpenAI **structured outputs** (`json_schema`, `strict`), and a **validator** that flags any project name the model used that was not in the evidence. |
| **RQ3** | What value does the AI layer add over the deterministic findings alone? | The deterministic output is a terse signature (e.g. `boundary-violation \| employees-feature -> leave-ui`); the AI layer adds `explanation`, `consequences`, `recommendedFix`. The Phase 5 fixes were applied directly from the AI's `recommendedFix` text. |
| **RQ4** | How can the quality of the AI's recommendations be evaluated? | `db.ts` persists every run (`analysis_runs` table); `validationWarnings` per finding is a machine metric; the T0/T1/T2 experiment gives ground truth; run history supports before/after comparison. |

---

## 3. The two deliverables

| Repository folder | What it is |
|-------------------|------------|
| `employeer-management-portal/` | **Case-study application.** A realistic Nx + Angular 22 monorepo: an HR portal with three business domains (`employees`, `leave`, `time`), a shared UI library, module-boundary lint rules, and a micro-frontend (Native Federation) split into a shell + two remotes. It is the *object of study*. |
| `architecture-analyzer/` | **The thesis tool.** A Node/TypeScript project: four deterministic detectors, an LLM explanation layer with a grounding validator, a SQLite run history, an HTTP API, a small Angular UI, a Git pre-push hook, and a GitHub Actions check. |

Public repository: `https://github.com/rinajasharaj/HR-Portal`

---

## 4. How the case-study application is built

### 4.1 Domain-driven library structure

13 libraries, organised as **domain × layer**:

```
libs/
  employees/ { domain-api, feature, data-access, ui }
  leave/     { domain-api, feature, data-access, ui }
  time/      { domain-api, feature, data-access, ui }
  shared/    { ui }
```

| Layer | Rule |
|-------|------|
| `domain-api` | The **only** public entry point of a domain. Other domains may import this and nothing else. |
| `feature` | Pages / smart components. |
| `data-access` | Services and state (mock data held in Angular signals). |
| `ui` | Small presentational components. |

Every library carries two Nx **tags**: `domain:<name>` and `type:<layer>`. These tags are what
the analyzer reads.

### 4.2 Enforced boundaries

`employeer-management-portal/eslint.config.mjs` configures `@nx/enforce-module-boundaries` so
that, at lint time:

- a library may depend only on its own domain or `domain:shared`;
- a `ui` library may depend only on other `ui` libraries; a `feature` may depend on
  `feature`/`data-access`/`ui`/`domain-api`; etc.

This is the "designed" architecture. The analyzer independently checks the *actual* dependency
graph against the same idea.

### 4.3 Micro-frontend split (Native Federation)

- **Shell / host:** `employeer-management-portal` — renders the frame, owns the Dashboard and
  the whole `time` domain.
- **Remotes:** `employees` (port 4201) and `leave` (port 4202) — loaded lazily via
  `loadRemoteModule`.
- `time` was kept inside the shell on purpose — two remotes is enough to demonstrate the
  pattern.

### 4.4 The cross-domain Dashboard (the "correct" example)

The Dashboard lives in the shell and shows figures from all three domains. It reads them **only
through each domain's `domain-api` facade** (an abstract class implemented by the domain's
store, wired via dependency injection). It never imports `data-access` or `feature`. This is the
deliberate *positive* counter-example to the injected boundary violation.

---

## 5. How the analyzer works

### 5.1 Pipeline

```
nx graph --file=graph-output.json      (Nx produces the dependency graph as JSON)
        │
        ▼
detectFindings(graphPath)               (4 deterministic detectors — NO AI)
        │  Finding[]
        ▼
for each finding:
    evidence package  ──►  gpt-4o-mini (structured output: explanation/consequences/recommendedFix)
                          │
                          ▼
                     validator  ──►  validationWarnings[]   (ungrounded project-name mentions)
        │
        ▼
{ evidence, aiExplanation, validationWarnings }[]   ──►  saved to SQLite + returned to the UI
```

### 5.2 The four detectors

| Detector | Fires when |
|----------|-----------|
| **Boundary violation** | A dependency crosses domains into a layer that is not `domain-api` (and the target is not `shared`). |
| **Circular dependency** | Two domains depend on each other in both directions. |
| **Untagged library** | A library has no `domain:`/`type:` tags. |
| **God library** | A library's `index.ts` exports something whose name belongs to a different business domain. |

### 5.3 Keeping the LLM grounded (RQ2)

1. **Evidence package** — the model receives *only* a small JSON object of verified facts.
2. **System prompt** — "Only use the facts given to you. Never invent details."
3. **Structured output** — `response_format: json_schema`, `strict: true` forces exactly three
   string fields; the response is always valid, parseable JSON.
4. **Validator** — after the call, the tool scans the three fields for any workspace project
   name that was not in the evidence. Each such mention becomes a `validationWarning`.

An analysis with **zero** validation warnings is fully grounded. On the eroded state (T1) the
tool produces grounded, warning-free explanations for all findings.

### 5.4 Persistence

Every run is written to `analysis-history.db` (`analysis_runs` table: timestamp, graph path,
finding count, full JSON). `GET /runs` and `GET /runs/:id` read it back.

---

## 6. The experiment

Four captured states of the case-study app, as Git tags and Nx graph snapshots:

| State | Git tag | Snapshot file | Expected findings |
|-------|---------|---------------|-------------------|
| **T0 — clean** | `t0-start` | `graph-output-t0.json` | none |
| **T1 — eroded** | `t1-eroded` | `graph-output-t1.json` | 2 boundary violations, 2 untagged libraries, 1 circular dependency |
| **T2 — restructured** | `t2-restructured` | `graph-output-t2.json` | none |
| **T3 — live catch** | `t3-boundary-violation-catch` | (live `graph-output.json`) | 1 boundary violation (`employees-feature → leave-ui`) |

The four T1 problems were injected deliberately (each as its own commit), so they are the
**ground truth**: the tool should find exactly these in T1 and nothing in T0/T2.

> **Note on the god-library detector:** it reads library *source files*, which are not frozen in
> the historical snapshots. So for T0/T1/T2 it reflects the *current* source, not the source at
> that tag. The other three detectors read the frozen graph and are correct per state. This
> limitation is discussed as an RQ1 finding: the dependency graph and the source tree carry
> different architectural facts.

---

## 7. Automated enforcement

| Layer | Mechanism | Behaviour |
|-------|-----------|-----------|
| **Local** | Husky `pre-push` hook (`.husky/pre-push`) | Before every `git push`: regenerate the graph, run the detectors, compare to `architecture-baseline.json`. Any finding **not** in the baseline aborts the push. |
| **Remote** | GitHub Actions (`.github/workflows/architecture-check.yml`) | On every pull request: the same check runs. It is a **required status check** (branch ruleset "main protection"), so a PR that introduces a new violation cannot be merged. |

The baseline is a *ratchet*: existing, accepted issues (the one deliberate boundary violation)
do not block work, but the architecture can never silently get worse. A permanently-open pull
request on the repository shows the CI check failing on a deliberately-introduced violation.

---

## 8. How it was developed (chronological)

| Phase | Outcome |
|-------|---------|
| 1 | Clean Nx + Angular monorepo, 13 tagged libraries, boundary lint rules (tag `t0-start`). |
| 2 | Four deliberate architectural problems injected, one commit each (tag `t1-eroded`). |
| 3 | Four deterministic detectors reading the Nx graph JSON. |
| 4 | LLM explanation layer: evidence packages, structured outputs, grounding validator. |
| 5 | Problems fixed from the AI's own recommendations (`t1-fixed`); micro-frontend split with Native Federation (`t2-restructured`). |
| 6 | `runAnalysis()` function; T0/T1/T2 graph snapshots; Express API; first `analyzer-ui`. |
| 7 | Taiga UI design system; six shared components. |
| 8 | Real features in every domain (lists, forms, approval queue, timesheet, org chart). |
| 9 | Cross-domain Dashboard reading through `domain-api` facades only. |
| 10 | A live violation introduced during development and caught by the tool (`t3-boundary-violation-catch`). |
| 11 | SQLite run history; `GET /runs`, `GET /runs/:id`; one-click `GET /analyze/live`; upgraded `analyzer-ui`. |
| 14 | Husky `pre-push` architecture gate with a baseline ratchet. |
| 15 | GitHub Actions check; repository made public; required-check ruleset; end-to-end blocked-PR demo. |

Phases **12** (comparison view), **13** (severity + trend), and **16** (externalised rule
config) are specified but not yet implemented — see `docs/PHASES.md` for their specs.

Full detail on every phase is in `docs/PHASES.md`; a file-by-file reference is in
`docs/REPOSITORY.md`.

---

## 9. Running it yourself

### 9.1 Prerequisites

- **Node.js 20+** (the analyzer uses the built-in `node:sqlite`, which needs Node 22+ unflagged;
  Node 22 LTS is the safe choice).
- **npm**.
- An **OpenAI API key** for the AI explanation layer (the deterministic parts and the CI gate
  need no key).

### 9.2 Install

```bash
# 1. the case-study app
cd employeer-management-portal
npm ci

# 2. the analyzer
cd ../architecture-analyzer
npm ci

# 3. the API key (analyzer only)
echo "OPENAI_API_KEY=sk-..." > .env
```

### 9.3 Run the analyzer end to end

```bash
# terminal A — the API
cd architecture-analyzer
npx tsx server.ts            # → http://localhost:3000

# terminal B — the UI
cd employeer-management-portal
npx nx serve analyzer-ui     # → http://localhost:4200 (note the port it prints)
```

Open the UI:

- **T0 / T1 / T2** buttons — analyse the frozen historical snapshots. T1 shows the injected
  problems with AI explanations; T0 and T2 show none.
- **Analyze current code** — regenerates the live graph and analyses the working tree
  (takes ~20 s). Shows the one deliberate `employees-feature → leave-ui` violation.

Command-line equivalents:

```bash
cd architecture-analyzer
curl http://localhost:3000/analyze/t1        # eroded state
curl http://localhost:3000/analyze/live      # current working tree
curl http://localhost:3000/runs              # run history
curl http://localhost:3000/runs/1            # one full run
```

Or without the server:

```bash
cd architecture-analyzer
npx tsx run-analysis.ts       # full pipeline on the live graph, writes analysis-run-*.json
npx tsx read-graph.ts         # detectors only, no AI, straight to the console
```

### 9.4 See the enforcement gate

```bash
# passes on a clean tree:
cd /path/to/HR-Portal
npm run check:architecture

# demonstrate a block: add this import to
# employeer-management-portal/libs/leave/feature/src/lib/leave-balance/leave-balance.ts
#   import { EmployeesStore } from '@employeer-management-portal/employees-data-access';
# then:
npm run check:architecture    # → "✗ PUSH BLOCKED — new architecture violation(s)"
# then revert the import.
```

The same check runs on every pull request via GitHub Actions; see the repository's **Actions**
tab and the open demonstration PR.

### 9.5 Run the full HR portal (optional, for context)

```bash
cd employeer-management-portal
npx nx serve employees                       # remote, port 4201
npx nx serve leave                           # remote, port 4202
npx nx serve employeer-management-portal      # shell, port 4200
```

Open `http://localhost:4200`. Use the sidebar "Switch to manager / employee" control to reveal
the leave-approval queue.

---

## 10. Suggested walkthrough for the defence

1. **Show the designed architecture** — `libs/` structure, the `tags` in a `project.json`, the
   `depConstraints` in `eslint.config.mjs`. *(RQ1: this is the deterministic signal.)*
2. **Show T1 in the analyzer UI** — the injected problems, each with an AI explanation,
   consequences, and a fix. *(RQ3: the value the AI layer adds.)*
3. **Show a `validationWarnings: []`** in the raw JSON (`curl /analyze/t1`) — the grounding
   check passed. *(RQ2.)*
4. **Show T0 and T2** — no findings; the tool does not cry wolf.
5. **Show "Analyze current code"** — the live catch of the deliberate
   `employees-feature → leave-ui` shortcut. *(RQ1/RQ3 in a real workflow.)*
6. **Show the run history** (`curl /runs`) and the SQLite table. *(RQ4.)*
7. **Show the gate** — run `npm run check:architecture`, add a violation, watch it block; then
   the open PR on GitHub with the failed required check.
8. **Discuss the god-library limitation** — graph-facts vs source-facts. *(RQ1.)*

---

## 11. Current limitations and planned work

- **God-library detector** reads current source, not historical snapshots (Section 6 note).
- **Detector logic is duplicated** between `run-analysis.ts` and `detectors.ts` — Phase 16 will
  unify them.
- **Rule configuration is hardcoded** to this workspace (domain names, the `shared` name, the
  `domain-api` type, the workspace path) — Phase 16 externalises it to
  `architecture-rules.json`, making the tool reusable on other Nx repos.
- **Comparison view** (Phase 12) and **severity + trend tracking** (Phase 13) are specified but
  not built; they would strengthen the Evaluation chapter (a side-by-side T0/T1/T2 figure and a
  degradation-over-time chart).
- A small list of housekeeping items (stray snapshot file, outdated `README.md`, the CI `push`
  trigger, committed run-dumps) is tracked in `docs/PHASES.md` § *Outstanding cleanup items* and
  will be resolved before final submission.

---

## 12. Where to read more

| Question | Document |
|----------|----------|
| "What did each phase do and why?" | `docs/PHASES.md` |
| "What is this file / what does this code do?" | `docs/REPOSITORY.md` |
| "How do I present and run it?" | this document |
| Original narrative log (phases 1–6) | `DEVELOPMENT-LOG.md` |
| Tool-only summary | `architecture-analyzer/README.md` *(pending update)* |
