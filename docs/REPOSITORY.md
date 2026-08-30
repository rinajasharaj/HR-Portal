# Repository Reference

A file-by-file guide to the whole repository: what each file is, why it exists, what it contains,
and — for files that contain logic — what that logic does.

**Scope note:** as requested, the *internal code* of the Angular component files in
`employeer-management-portal/apps/**` and `employeer-management-portal/libs/**` is **not**
line-explained here — those files are only described by their role. Everything else (the
analyzer, all config, build, CI, and tooling files) is explained in detail.

> Companion documents: `docs/PHASES.md` (phase-by-phase history) and `docs/THESIS-GUIDE.md`
> (presentation guide for the mentor).

---

## 1. Top-level layout

```
HR-Portal/                         ← the Git repository
├── package.json                   ← root workspace (hosts Husky only)
├── package-lock.json
├── .husky/pre-push                ← local architecture gate
├── .github/workflows/             ← CI architecture gate
├── DEVELOPMENT-LOG.md             ← original narrative log (phases 1–6)
├── LICENSE
├── docs/                          ← this documentation set
├── architecture-analyzer/         ← THE THESIS TOOL (Node/TypeScript)
└── employeer-management-portal/   ← THE CASE-STUDY APP (Nx + Angular monorepo)
```

Two independent npm projects live inside one Git repo. They are **not** an npm workspace — each
has its own `package.json` / `node_modules`. The root `package.json` exists only so Husky has
somewhere to live.

---

## 2. Root-level files

### `package.json` (root)

**Why:** Husky (the Git-hook manager) needs an npm project at the Git root.

**Contains:**
- `"name": "hr-portal-workspace"`, `"private": true` — never published, just a container.
- `"scripts"`:
  - `"check:architecture": "cd architecture-analyzer && npx tsx check-architecture.ts"` — run
    the architecture gate by hand without pushing.
  - `"prepare": "husky"` — added by `husky init`; runs on `npm install` and installs the hooks.
- `"devDependencies": { "husky": "^9.x" }`.

### `package-lock.json` (root)

Lockfile for the single `husky` dependency. Committed so installs are reproducible.

### `.husky/pre-push`

**Why:** Phase 14 — block a `git push` if it would introduce a new architecture violation.

**Contains one line:**
```sh
cd architecture-analyzer && npx tsx check-architecture.ts
```
Git runs this from the repo root before every push. If `check-architecture.ts` exits non-zero,
the push is aborted. `.husky/_/` (git-ignored) holds Husky's internal wrapper scripts.

### `.github/workflows/architecture-check.yml`

**Why:** Phase 15 — the server-side architecture gate that cannot be bypassed with `--no-verify`.

**Contains:**
- `on: pull_request` **and** `push: branches: [main]` (the `push` trigger is cleanup item C4 —
  the intent was PR-only).
- One job `architecture` on `ubuntu-latest`, env `NX_DAEMON: 'false'`, `NX_CLOUD: 'false'`.
- Steps: checkout → setup Node 22 → `npm ci` in `architecture-analyzer/` → `npm ci` in
  `employeer-management-portal/` → `npx tsx check-architecture.ts` (working directory
  `architecture-analyzer`).
- No secrets: the CI gate is deterministic-only and never calls the LLM.

### `DEVELOPMENT-LOG.md`

The original hand-written narrative log. Covers Phases 1–6 in prose and ends stating "all 6
phases complete". Superseded by `docs/PHASES.md` (cleanup item C6).

### `LICENSE`

MIT license file.

### `.gitignore` (root)

Two lines: `.env`, `node_modules/`. Applies recursively, so it also covers
`architecture-analyzer/.env` and every `node_modules/` in the tree.

### `.gitattributes`, `.idea/`, `.claude/launch.json`

- `.gitattributes` — line-ending normalisation (Git default).
- `.idea/` — JetBrains/WebStorm project files (`HR-Portal.iml`, `modules.xml`, `vcs.xml`). No
  personal data (uses `$MODULE_DIR$`). Committed; could be ignored (cleanup C10).
- `.claude/launch.json` — a dev-server launch config used by the Claude Code "Browser" preview
  tool: names the `shell` app and its port (4200). Harmless if published.

---

## 3. `architecture-analyzer/` — the thesis tool

Plain Node + TypeScript, run through **`tsx`** (no build step, no `tsconfig.json`). CommonJS
(`"type": "commonjs"` in its `package.json`), so `__dirname` and `require.main` are available.

### 3.1 Production files (the actual pipeline)

---

#### `detectors.ts` — the deterministic detection engine

**Why:** the AI-free core. Extracted in Phase 14 so both the server pipeline and the Git/CI gate
can share one implementation. (Currently `run-analysis.ts` still has its *own* copy — cleanup
C2.)

**Exports:**
- `interface Finding` — `{ findingType: 'boundary-violation' | 'untagged-library' |
  'circular-dependency' | 'god-library'; [key: string]: unknown }`.
- `function detectFindings(graphPath: string): Finding[]`.

**What the code does:**

1. **Read the graph.** `JSON.parse(readFileSync(graphPath))` → `graph.nodes` (every project,
   keyed by name, with `.type` = `'lib'` or `'app'` and `.data.tags` / `.data.sourceRoot`) and
   `graph.dependencies` (per source project, an array of `{ target, source, type }`).
2. Two helpers: `getDomain(tags)` returns the part after `domain:`; `getType(tags)` returns the
   part after `type:`.
3. **Boundary-violation detector.** For every dependency edge, compute
   `isCrossDomain` (source domain ≠ target domain, both present), `isNotShared`
   (target domain ≠ `'shared'`), `skipsThePublicDoor` (target type ≠ `'domain-api'`). If all
   three → push a `boundary-violation` finding with source, target, both domains, target type,
   and a human-readable `rule` string.
4. **Untagged-library detector.** For every node, if `type === 'lib'` and `tags.length === 0` →
   push an `untagged-library` finding.
5. **Circular-dependency detector.** Build `domainDeps: Record<string, Set<string>>` — for each
   edge whose source and target have *different* domains, record `sourceDomain → targetDomain`.
   Then for every `A → B`, if `B → A` also exists, push one `circular-dependency` finding
   (deduplicated with a sorted `"a,b"` key).
6. **God-library detector.** For each `lib` node: read
   `../employeer-management-portal/<sourceRoot>/index.ts`, keep lines starting with `export`,
   and for each known domain name (`employees`, `leave`, `time`) that is **not** this library's
   own domain, if an export line mentions it → collect it. Any collected lines → push a
   `god-library` finding listing them.
   *Limitation:* this reads the **current** `index.ts`, so on historical snapshots it reflects
   today's source (documented, accepted — see PHASES.md Phase 11 note).
7. Return the combined `Finding[]`.

---

#### `run-analysis.ts` — the full pipeline (detectors + AI + validation + persistence)

**Why:** Phase 4/6 — turns findings into grounded, structured, stored explanations.

**Exports:** `async function runAnalysis(graphPath: string)` → array of
`{ evidence, aiExplanation, validationWarnings }`.

**What the code does:**

1. `import 'dotenv/config'` loads `OPENAI_API_KEY` from `.env`; `new OpenAI()` picks it up.
2. **Detection.** *(Currently an inline duplicate of all four detectors from `detectors.ts` —
   cleanup C2.)* Produces `allFindings`.
3. **`explainFinding(evidence)`** — one `client.chat.completions.create` call:
   - model `gpt-4o-mini`;
   - system message: *"You are an assistant explaining frontend architecture problems. Only use
     the facts given to you. Never invent details."*;
   - user message: the evidence object as pretty JSON + "Explain this finding.";
   - `response_format: { type: 'json_schema', strict: true, schema: { … } }` forcing an object
     with required string fields `explanation`, `consequences`, `recommendedFix` and
     `additionalProperties: false`;
   - returns `JSON.parse(response.choices[0].message.content)`.
4. **`validateResponse(evidence, aiResult, nodes)`** — grounding check:
   - collect every string value (and array-of-string value) from the evidence into
     `allowedNames` (lowercased);
   - concatenate the AI's three fields, lowercase it;
   - for every workspace project name, if it appears in the AI text but is **not** in
     `allowedNames` → push a warning `AI mentioned "<name>" but it wasn't in the evidence`.
   - returns `string[]` (empty = fully grounded).
5. **Loop** over `allFindings`: call `explainFinding`, then `validateResponse`, collect
   `{ evidence, aiExplanation, validationWarnings }`.
6. **Persist.** `saveRun(graphPath, analysisRun)` (from `db.ts`) → logs the new row id.
7. Return the array.
8. **`if (require.main === module)`** — when run directly (`npx tsx run-analysis.ts`): runs
   `runAnalysis()` on a graph file *(currently the stray `graph-output-03.json` — cleanup C1)*
   and also writes a timestamped `analysis-run-<ISO>.json` file.

---

#### `db.ts` — persistence (Phase 11)

**Why:** store every analysis run so history, comparison, and trend features can read it back.

**What the code does:**

- `import { DatabaseSync } from 'node:sqlite'` — Node's **built-in** SQLite (no native module).
- `const DB_PATH = join(__dirname, 'analysis-history.db')` — DB file next to the source;
  git-ignored via `architecture-analyzer/.gitignore`.
- `new DatabaseSync(DB_PATH)` opens/creates it.
- `db.exec('CREATE TABLE IF NOT EXISTS analysis_runs (…)')` — columns
  `id` (autoincrement PK), `created_at` (ISO text), `graph_path` (text), `finding_count` (int),
  `results_json` (text — the full run serialized).
- **Exports:**
  - `interface AnalysisRunRow` / `type AnalysisRunSummary` (row without `results_json`).
  - `saveRun(graphPath, results): number` — prepared `INSERT`; returns `lastInsertRowid`.
  - `getAllRuns(): AnalysisRunSummary[]` — `SELECT id, created_at, graph_path, finding_count …
    ORDER BY id DESC` (omits the big blob for a lightweight list).
  - `getRunById(id): AnalysisRunRow | undefined` — `SELECT * … WHERE id = ?`.
- All queries use `?` placeholders (no string-built SQL).

---

#### `check-architecture.ts` — the Git/CI gate (Phase 14)

**Why:** decide whether the current code introduces a *new* architecture violation versus an
accepted baseline. Run by `.husky/pre-push` and by the CI workflow.

**What the code does:**

- Constants: `GRAPH_PATH = '../employeer-management-portal/graph-output.json'`,
  `BASELINE_PATH = 'architecture-baseline.json'`.
- **`signature(finding)`** — a short stable identity string per finding:
  - boundary → `boundary-violation | <source> -> <target>`
  - circular → `circular-dependency | <a> <-> <b>` (domains sorted)
  - untagged → `untagged-library | <library>`
  - god → `god-library | <library>`
- **`currentSignatures()`** — `execSync('npx nx graph --file=graph-output.json', { cwd:
  '../employeer-management-portal' })` to regenerate the graph, then
  `detectFindings(GRAPH_PATH).map(signature).sort()`.
- **Mode 1 — `--update-baseline`:** write
  `{ generatedAt, acceptedFindings: currentSignatures() }` to `architecture-baseline.json`,
  print them, exit 0.
- **Mode 2 — default check:**
  - if no baseline file → print how to create one, exit 1;
  - load `acceptedFindings` into a `Set`;
  - `newViolations` = current signatures not in the set;
  - `fixed` = baseline signatures no longer present (printed as a note, does not fail);
  - if `newViolations` non-empty → print `✗ PUSH BLOCKED` + the list, exit 1;
  - else → print `✓ No new architecture violations`, exit 0.

---

#### `server.ts` — the HTTP API (Phases 6 + 11)

**Why:** lets `analyzer-ui` (and `curl`) drive the pipeline.

**What the code does:** Express 5 app, `cors()` enabled, JSON body parsing, listens on `:3000`.
Routes:

| Route | Behaviour |
|-------|-----------|
| `GET /analyze/live` | `execSync('npx nx graph --file=graph-output.json', { cwd: '../employeer-management-portal' })` to regenerate the live graph, then `await runAnalysis('../employeer-management-portal/graph-output.json')`, return the results array. Errors → `500` with a detail string. |
| `GET /analyze/:state` | Maps `t0` / `t1` / `t2` to the corresponding `graph-output-t*.json` snapshot; unknown → `400`. Calls `runAnalysis(snapshot)`. |
| `GET /runs` | `getAllRuns()` — the run-history list. |
| `GET /runs/:id` | `getRunById(Number(id))`; `404` if missing; otherwise returns `{ id, createdAt, graphPath, findingCount, results }` with `results_json` parsed. |

`/analyze/live` is declared **before** `/analyze/:state` so Express does not treat `"live"` as a
`:state` value.

*(No `/compare` endpoint — that was Phase 12, not implemented.)*

---

#### `architecture-rules.json` and `config.ts`

**Not present.** These are Phase 16 (not started). See PHASES.md for the spec and agent prompt.

### 3.2 Exploratory / historical scripts (not part of the pipeline)

| File | What it is | Status |
|------|-----------|--------|
| `read-graph.ts` | The first exploration script (Phase 3): prints tags, dependencies, then runs all four detectors *plus* the rejected "export count ≥ 3" god-library heuristic, straight to the console. Reads `graph-output-03.json`. | Useful for a quick AI-free look; keep or archive (C8). |
| `evidence-packages.ts` | Phase 3/4 step: builds the four finding types as "evidence package" objects and prints them. Reads a **non-existent** `../hr-portal-web/graph-output.json`. | Dead — delete or fix path (C8). |
| `ai-explains.ts` | Phase 4 prototype: one hardcoded boundary-violation evidence object → one `gpt-4o-mini` structured-output call → prints `{ explanation, consequences, recommendedFix }`. | Historical; keep as the "first AI call" artefact or archive (C8). |

### 3.3 Data / generated files

| File | What it is |
|------|-----------|
| `architecture-baseline.json` | The accepted-findings baseline for `check-architecture.ts`. Shape: `{ generatedAt, acceptedFindings: string[] }`. Currently one entry: `boundary-violation \| employees-feature -> leave-ui` (the deliberate Phase 10 violation). **Committed on purpose.** |
| `analysis-run-*.json` | Timestamped full-run dumps written by `run-analysis.ts` when run directly. Several are committed (cleanup C9). |
| `analysis-history.db` | The SQLite database (Phase 11). **Git-ignored.** |
| `.env` | `OPENAI_API_KEY=...`. **Git-ignored, never committed.** |
| `README.md` | Short tool description. Outdated run command and endpoint list (cleanup C7). |
| `package.json` / `package-lock.json` | Dependencies: `@anthropic-ai/sdk`, `openai`, `express`, `cors`, `dotenv`, `@nx/devkit`, `tsx`, `typescript`. (`@anthropic-ai/sdk` is installed but the pipeline currently uses `openai`.) |
| `.gitignore` | One line: `analysis-history.db`. |
| `.idea/` | JetBrains project files. |

---

## 4. `employeer-management-portal/` — the case-study Nx workspace

### 4.1 Workspace-level configuration

---

#### `nx.json`

**Why:** the Nx workspace control file.

**Contains:**
- `"analytics": false`.
- `namedInputs` — cache-input groups (`default`, `production`, `sharedGlobals`); `production`
  excludes lint config from build cache keys.
- `targetDefaults` — caching + `dependsOn: ["^build"]` for `@angular/build:application`; cache +
  explicit inputs for `@nx/eslint:lint`.
- `generators` — defaults for `@nx/angular` generators: no e2e, no unit tests, SCSS app styles,
  CSS component styles, eslint linter.

---

#### `tsconfig.base.json`

**Why:** shared TypeScript config + the **path aliases** that make libraries importable.

**Contains:**
- Compiler options: `moduleResolution: "bundler"`, decorators enabled, `target: es2015`,
  `module: esnext`, `strict: false`, `skipLibCheck: true`.
- **`paths`** — maps every library alias to its `src/index.ts` barrel, e.g.
  `"@employeer-management-portal/employees-domain-api": ["./libs/employees/domain-api/src/index.ts"]`.
  These 13 aliases are what `import { X } from '@employeer-management-portal/...'` resolves to,
  and what Nx uses to build the dependency graph.

---

#### `eslint.config.mjs` (workspace root)

**Why:** hosts the **module-boundary rule** — the deterministic constraint the whole thesis
depends on.

**Contains:**
- Nx flat-config presets (`flat/base`, `flat/typescript`, `flat/javascript`).
- `ignores: ["**/dist", "**/out-tsc"]`.
- The **`@nx/enforce-module-boundaries`** rule (error level) with `depConstraints`:

  | `sourceTag` | may only depend on |
  |-------------|--------------------|
  | `domain:employees` | `domain:employees`, `domain:shared` |
  | `domain:leave` | `domain:leave`, `domain:shared` |
  | `domain:time` | `domain:time`, `domain:shared` |
  | `type:feature` | `type:feature`, `type:data-access`, `type:ui`, `type:domain-api` |
  | `type:ui` | `type:ui` |
  | `type:data-access` | `type:data-access`, `type:ui`, `type:domain-api` |
  | `*` | `*` |

  The final `* → *` entry is the **catch-all** added during this project: without it, Nx forbids
  *any* project whose tags match no constraint (i.e. the tag-less apps) from importing *any*
  library. With it, the apps are unrestricted while the tagged libraries keep their real rules.

---

#### `package.json` (workspace)

**Why:** dependencies for the Angular monorepo.

**Key contents:**
- `"name": "@employeer-management-portal/source"`, `"private": true`, no scripts (Nx runs
  everything).
- **dependencies:** Angular 22 (`~22.0.x`), Taiga UI v5 (`@taiga-ui/core`, `cdk`, `kit`,
  `layout`, `addon-table`, `styles`, `icons`, `event-plugins`, …), `@maskito/*`,
  `@ng-web-apis/*`, `es-module-shims` (needed by Native Federation), `rxjs`.
- **devDependencies:** `@angular-architects/native-federation` + `@softarc/native-federation-*`,
  `@angular/build`, `@angular/cli`, Nx `23.1.0` packages, `angular-eslint`, `typescript ~6.0.x`,
  `prettier`.
- Note: `@angular/core` appears in **both** `dependencies` and `devDependencies` — deliberate,
  the Native Federation gotcha from Phase 5.

---

#### `package-lock.json` (workspace)

Full dependency lockfile. The CI workflow's `npm ci` step depends on it being in sync.

---

#### `.editorconfig`, `.prettierrc`, `.prettierignore`, `.vscode/extensions.json`, `.claude/launch.json`

- `.editorconfig` / `.prettierrc` / `.prettierignore` — formatting rules (2-space indent, single
  quotes, etc.).
- `.vscode/extensions.json` — recommended VS Code extensions (Nx Console, Angular, ESLint).
- `.claude/launch.json` — dev-server launch configs (`employees-remote` :4201,
  `leave-remote` :4202, `shell` :4200) for the preview tool.

---

#### `README.md` (workspace)

The default Nx-generated readme.

---

### 4.2 The four applications (`apps/`)

Each app has: `project.json` (Nx targets), `src/` (`main.ts`, `index.html`, `styles.scss`,
`app/`), three `tsconfig*.json` files, `eslint.config.mjs`, `public/favicon.ico`. The three
Angular front-ends also have `federation.config.mjs`.

---

#### `apps/employeer-management-portal/` — the **shell / host**

- **Role:** the Native Federation host. Renders the app frame (`<lib-shell>` — sidebar nav +
  breadcrumbs + `<router-outlet />`), owns the **Dashboard** and the whole **Time** domain, and
  lazy-loads the `employees` and `leave` remotes.
- **`project.json`** — the most complex build config in the repo:
  - `build` / `serve` targets use the `@angular-architects/native-federation` executor;
  - a nested `esbuild` target (`@angular/build:application`) carries the real browser build
    options: `stylePreprocessorOptions.includePaths: ["node_modules"]`, an `assets` entry
    copying `@taiga-ui/icons` SVGs to `assets/taiga-ui/icons`, and the `styles` array beginning
    with `./node_modules/@taiga-ui/styles/taiga-ui-theme.less` (the Phase 7 gotcha), then
    `src/styles.scss`; `polyfills: ["es-module-shims"]`;
  - `serve-original` runs the plain dev server on port 4200.
  - `"tags": []` — apps are intentionally untagged.
- **`federation.config.mjs`** — `name: 'employeer-management-portal'`; `remotes` block pointing
  at `http://localhost:4201/remoteEntry.json` (employees) and `:4202` (leave); `shareAll(...)`
  with the `@angular/core` `includeSecondaries` override; `denseChunking: true`.
- **`src/app/app.ts` / `app.html`** *(component code not line-explained)* — wraps everything in
  `<lib-shell>`, builds the `NavItem[]` list with `computed()`, and adds the "Approvals" nav
  item only when `CurrentUserService.isManager()` is true.
- **`src/app/app.config.ts`** — providers: `provideRouter(routes)`,
  `provideBrowserGlobalErrorListeners()`, and **`provideEmployeesData()` / `provideLeaveData()` /
  `provideTimeData()`** — these bind each domain's abstract facade to its concrete store so the
  Dashboard can read cross-domain data through `domain-api` only.
- **`src/app/app.routes.ts`** — `''` → redirect to `dashboard`; `dashboard` → lazy
  `Dashboard`; `employees` → `loadRemoteModule('employees', './routes')`; `leave` →
  `loadRemoteModule('leave', './routes')`; `time`, `time/clock`, `time/history` → the Time
  components (which live in the shell).
- **`src/app/dashboard/`** *(component code not line-explained)* — `dashboard.ts` / `.html` /
  `.css`: the cross-domain summary page. Injects `EmployeesFacade`, `LeaveFacade`, `TimeFacade`;
  exposes their signals; holds a mock `recentActivity` signal of `ActivityEvent[]`. Also imports
  `LeaveStatusBadgeComponent` — but because the shell app is untagged, this particular import is
  **not** flagged by the analyzer (only the `employees-feature` copy is).

---

#### `apps/employees/` — the **employees remote** (port 4201)

- **Role:** a Native Federation remote exposing the employees pages.
- **`federation.config.mjs`** — `name: 'employees'`; **`exposes`** `./Component` (the root
  `App`) and `./routes` (`app.routes.ts`); `shareAll(...)`. No `remotes` (it is a leaf).
- **`src/app/app.ts`** *(not line-explained)* — a near-empty root component
  (`protected title = 'employees'`) with `<router-outlet />` in its template; it only exists so
  the remote can bootstrap standalone during development.
- **`src/app/app.routes.ts`** — `''` → `EmployeeList`; `org-chart` → `OrgChart`;
  `:id/edit` → `EmployeeEditForm`; `:id` → `EmployeeProfile`. Imported into the shell via
  `loadRemoteModule('employees', './routes')`.
- **`src/app/app.config.ts`** — `provideRouter(routes)` + error listeners only.

---

#### `apps/leave/` — the **leave remote** (port 4202)

- **Role:** Native Federation remote exposing the leave pages.
- **`federation.config.mjs`** — `name: 'leave'`; `exposes` `./Component` + `./routes`.
- **`src/app/app.routes.ts`** — `''` → `MyLeaveRequests`; `request` → `LeaveRequestForm`;
  `approvals` → `LeaveApprovalQueue`; `balance` → `LeaveBalanceView`.
- **`src/app/app.ts` / `app.config.ts`** — same minimal shape as the employees remote.

---

#### `apps/analyzer-ui/` — the **analyzer front-end**

- **Role:** the UI for the thesis tool (not part of the HR product). Talks to
  `architecture-analyzer/server.ts` on `:3000`.
- **`project.json`** — plain `@angular/build:application` (no federation). During this project
  its `build.options` gained `stylePreprocessorOptions.includePaths`, the Taiga icon `assets`
  entry, and the `styles` array now starts with the Taiga theme `.less` — so it can reuse the
  `shared-ui` `Card` and `Button`.
- **`src/app/app.config.ts`** — `provideRouter(appRoutes)`, `provideBrowserGlobalErrorListeners()`,
  and **`provideHttpClient()`** (added in Phase 11 — it was missing, which had silently broken
  the original buttons).
- **`src/app/app.routes.ts`** — `export const appRoutes: Route[] = []` (single-page; the Phase
  12 comparison route would be added here).
- **`src/app/app.ts`** *(logic summarised — this is the analyzer UI, not an HR component)*:
  - `inject(HttpClient)`; signals `loading`, `error`, `results: AnalysisItem[]`.
  - `analyzeState(state)` → GET `http://localhost:3000/analyze/<state>`;
    `analyzeLive()` → GET `.../analyze/live`.
  - `cardTitle(item)` builds a heading like `boundary-violation — employees-feature`.
  - `execute(url)` sets `loading`, clears state, subscribes; on success stores `results`, on
    error sets a "is the backend running on :3000?" message.
- **`src/app/app.html`** — buttons `T0` / `T1` / `T2` / **Analyze current code**; a loading
  line; an error line; `@for` over `results()` rendering each finding in a `<lib-card>` with
  explanation / consequences / recommended fix and a validation-warning count; an empty-state
  message.
- **`src/app/models/analysis-item.model.ts`** — interfaces `AnalysisEvidence`,
  `AiExplanation`, `AnalysisItem` describing the `server.ts` response. (`findingType: string`
  could be tightened to the union — cleanup C12.)
- **`src/main.ts`** — standard `bootstrapApplication(App, appConfig)`.

---

### 4.3 The 13 libraries (`libs/`)

Every library folder has: `src/index.ts` (the **public barrel** — the only thing other projects
may import), `src/lib/...` (implementation), `project.json` (name, `sourceRoot`, `prefix`,
`projectType: "library"`, **`tags`**, a `lint` target), `tsconfig.json` / `tsconfig.lib.json`,
`eslint.config.mjs`, `README.md`.

The `tags` array in each `project.json` is the single most important line for the analyzer.

| Library | `tags` | What `index.ts` exports | Component code line-explained here? |
|---------|--------|--------------------------|-------------------------------------|
| `libs/employees/domain-api` | `domain:employees`, `type:domain-api` | `Employee` / `EmployeeStatus` models, `OrgNode` model, `EmployeesFacade` (abstract class) | facade explained below; models are plain interfaces |
| `libs/employees/data-access` | `domain:employees`, `type:data-access` | `EmployeesStore` + `provideEmployeesData()` | No (store logic summarised below) |
| `libs/employees/feature` | `domain:employees`, `type:feature` | `EmployeeList`, `EmployeeProfile`, `EmployeeEditForm`, `OrgChart` | No |
| `libs/employees/ui` | `domain:employees`, `type:ui` | *(empty barrel — the badge was moved to `leave/ui`)* | — |
| `libs/leave/domain-api` | `domain:leave`, `type:domain-api` | `LeaveRequest` / `LeaveType` / `LeaveStatus` / `LeaveBalance` models, `LeaveFacade` (abstract), `LeaveSummary` component | facade + models |
| `libs/leave/data-access` | `domain:leave`, `type:data-access` | `LeaveStore` + `provideLeaveData()` | No |
| `libs/leave/feature` | `domain:leave`, `type:feature` | `MyLeaveRequests`, `LeaveRequestForm`, `LeaveApprovalQueue`, `LeaveBalanceView` | No |
| `libs/leave/ui` | `domain:leave`, `type:ui` | `LeaveStatusBadgeComponent` | No (but see the deliberate-violation note) |
| `libs/time/domain-api` | `domain:time`, `type:domain-api` | `TimesheetEntry` / `WeekSummary` / `ClockStatus` models, `TimeFacade` (abstract) | facade + models |
| `libs/time/data-access` | `domain:time`, `type:data-access` | `TimeStore` + `provideTimeData()` | No |
| `libs/time/feature` | `domain:time`, `type:feature` | `WeeklyTimesheet`, `ClockInOut`, `TimeHistory` | No |
| `libs/time/ui` | `domain:time`, `type:ui` | *(empty barrel)* | — |
| `libs/shared/ui` | `domain:shared`, `type:ui` | `ButtonComponent`, `Input`, `Card`, `Table`, `Shell`, `NavItem`, `ActivityEvent`, `CurrentUserService`, `formatDate` / `daysBetween` | see below |

**The facades** (`EmployeesFacade`, `LeaveFacade`, `TimeFacade`) — abstract classes in each
`domain-api` declaring read-only `Signal<...>` members (e.g. `totalCount`, `pendingCount`,
`hoursThisWeek`, `upcomingThisMonthCount`). They are the *contract*; the concrete class is the
domain's Store in `data-access`, bound with `{ provide: <Facade>, useExisting: <Store> }`
returned by `provide<Domain>Data()` and registered in the shell's `app.config.ts`. This is what
lets the Dashboard read cross-domain data without importing `data-access` or `feature`.

**The domain Stores** (`EmployeesStore`, `LeaveStore`, `TimeStore`) in `data-access` —
`@Injectable({ providedIn: 'root' })` classes holding mock data in `signal()`s and exposing
`computed()` aggregates + mutation methods (`add`, `approve`, `reject`, `update`, `clockIn`…).
They `implements` their domain facade.

**`shared-ui` pieces:**
- `formatDate(date)` / `daysBetween(start, end)` — pure date helpers (`date-utils.ts`).
- `Button`, `Input`, `Card`, `Table` — thin standalone wrappers over Taiga primitives
  (`tuiButton`, `tuiTextfield`, `tuiCardLarge`, `tuiTable` + `tuiPagination`); all use signal
  inputs; `Table` tracks `currentPage`/`totalPages` but leaves data-slicing to the caller.
- `Shell` — the app frame: sidebar built from a `navItems` input, `TuiBreadcrumbs`,
  `<router-outlet />`, and a role-switch button wired to `CurrentUserService`.
- `NavItem` (`models/nav-items.ts`) — `{ label: string; route: string }`.
- `ActivityEvent` (`models/activity-event.ts`) — the dashboard recent-activity item; lives in
  `shared` because it aggregates over domains.
- `CurrentUserService` — a mock "who am I" service: `userId` / `userName` signals, a
  `role` signal (`'employee' | 'manager'`), `isManager` computed, `toggleRole()`. Because each
  Native Federation remote bundles its own copy, the role is also broadcast over a
  `window` `CustomEvent` bus so the shell's toggle reaches the leave remote's approval queue.

**Deliberate violation note:** `LeaveStatusBadgeComponent` (in `leave/ui`,
`domain:leave` + `type:ui`) is imported by `employees-feature` (`EmployeeList`,
`EmployeeProfile`) and by the shell Dashboard. The class carries a comment marking it as an
intentional study-case boundary violation. The analyzer flags the `employees-feature → leave-ui`
edge; it is recorded in `architecture-baseline.json` as accepted, so the gate only fails on
*additional* violations.

---

### 4.4 Generated graph snapshots (`employeer-management-portal/*.json`)

| File | Role |
|------|------|
| `graph-output.json` | The **live** graph — regenerated every time `check-architecture.ts` or `/analyze/live` runs. |
| `graph-output-t0.json` | Frozen T0 (clean) snapshot — used by `GET /analyze/t0`. |
| `graph-output-t1.json` | Frozen T1 (eroded) snapshot — `GET /analyze/t1`. |
| `graph-output-t2.json` | Frozen T2 (restructured) snapshot — `GET /analyze/t2`. |
| `graph-output-03.json` | Stray snapshot, no defined role (cleanup C3); read by `read-graph.ts` and by `run-analysis.ts`'s direct-run block (C1). |

Each is the raw output of `nx graph --file=<name>.json`: `{ graph: { nodes, dependencies }, … }`.

---

## 5. `docs/`

| File | Purpose |
|------|---------|
| `PHASES.md` | Phase-by-phase history (what / why / how), future-work specs + agent prompts, cleanup list. |
| `REPOSITORY.md` | This file. |
| `THESIS-GUIDE.md` | Presentation-oriented guide for the thesis mentor, with setup + demo steps and the research-question mapping. |
