# Development Log — AI-Assisted Architecture Analysis for Enterprise Frontend Applications

This log documents the development process of the thesis project, in order. Useful for the thesis's Methodology and Implementation chapters, and as a personal reference for what was built and why.

## Repositories

- **`HR-Portal/employeer-management-portal`** — the example Nx workspace (case study app)
- **`architecture-analyzer`** — the analysis tool (thesis deliverable)

---

## Phase 1: Clean baseline architecture (T0)

**Goal**: build a realistic, well-structured Nx monorepo to serve as the "before" state.

**What was built**:
- Nx workspace with Angular, esbuild builder (chosen over webpack because Native Federation, used later, is esbuild-native)
- 13 libraries across 3 domains (`employees`, `leave`, `time`) + 1 shared domain, following a consistent pattern per domain:
  - `domain-api` — public entry point (facade pattern); the only door into a domain
  - `feature` — pages/smart components
  - `data-access` — services and state
  - `ui` — small reusable presentational components
- Every library tagged with `domain:<name>` and `type:<name>`
- Nx module boundary lint rules (`@nx/enforce-module-boundaries`) configured with `depConstraints`:
  - domain-level constraint: a library can only depend on libraries in the same domain, or `domain:shared`
  - type-level constraint: restricts what `feature`/`ui`/`data-access` are allowed to import
- Verified enforcement by triggering a real lint error with an illegal cross-domain import, then removing it

**Tagged**: `t0-start`

---

## Phase 2: Deliberate architectural erosion (T1)

**Goal**: inject realistic, known architecture problems to create ground-truth test data for the analysis tool.

**Issues injected** (each its own commit, with a realistic human-sounding commit message):
1. **Boundary violation** — `leave-feature` imports `employees-data-access` directly, bypassing `employees-domain-api`
2. **God library** — `shared-ui` given 3 exports: a generic button (fine), a date utility (borderline), and a `leave-status-badge` component (domain-specific code that doesn't belong in a shared library)
3. **Circular dependency** — `leave-feature` imports `time-feature`, and `time-feature` imports `leave-domain-api`, creating a domain-level cycle (`leave` ↔ `time`)
4. **Untagged libraries** — tags removed from `shared-ui` and `time-ui`

Verified visually via `nx graph`, which showed the `leave ↔ time` cycle and the `leave → employees` violation as arrows.

**Tagged**: `t1-eroded`

---

## Phase 3: Deterministic detection engine

**Goal**: extract facts from the Nx project graph and detect the 4 injected problem types, with zero AI involvement — detection must be deterministic and explainable.

**Approach**:
- `nx graph --file=graph-output.json` dumps the project graph (nodes + tags + dependencies) as JSON
- A TypeScript script reads this JSON and implements 4 detectors:
  1. **Boundary violation detector** — compares source/target domain tags per import; flags cross-domain imports into anything other than `type:domain-api`
  2. **Circular dependency detector** — builds a domain-level dependency graph and checks for bidirectional edges between domains
  3. **Untagged library detector** — flags any library node with an empty `tags` array
  4. **God library detector** (iterated twice):
     - v1 (rejected): counted `index.ts` export lines above a threshold — a weak heuristic, since export *count* doesn't indicate whether exports are related
     - v2 (kept): checks whether an export path mentions a *different* known domain name than the library's own tag — a more explainable, lower-false-positive heuristic

All 4 detectors correctly re-detected all 4 issues injected in Phase 2, and correctly found zero issues on `t0-start`.

---

## Phase 4: AI-grounded explanation layer

**Goal**: use an LLM to explain each deterministic finding — never to detect problems itself — with outputs the tool can validate for grounding.

**Steps**:
1. Each finding converted into an **evidence package**: a plain object with only verified facts (source, target, domains, types, the violated rule) — no AI involvement at this stage
2. Evidence sent to OpenAI (`gpt-4o-mini`) via `chat.completions.create`, with a system prompt instructing the model to only use given facts
3. Switched to **structured outputs** (`response_format: json_schema`) to force a fixed shape: `explanation`, `consequences`, `recommendedFix` — guarantees valid, parseable JSON instead of free text
4. Built a **validator**: scans the AI's response text for any workspace library name that wasn't present in the evidence sent to it, flagging potential ungrounded claims
5. Wired all 4 detectors into one pipeline (`runAnalysis()`), looping through every finding automatically and saving the full run (evidence + AI explanation + validation warnings) as a timestamped JSON file

**Result**: running the full pipeline against `t1-eroded` produces 6 grounded, validated, structured findings with zero validation warnings.

---

## Phase 5: Applying recommendations + microfrontend restructuring (T2)

**Goal**: prove the tool's findings are actionable by fixing them, then physically split the app into microfrontends.

**Fixes applied** (based on the AI's own recommendations):
1. Removed the illegal `employees-data-access` import from `leave-feature`
2. Removed the illegal `time-feature` import from `leave-feature` (this also broke the circular dependency, since it was the same import causing both problems)
3. Added missing tags to `shared-ui` and `time-ui`
4. Moved `leave-status-badge` out of `shared-ui` into `leave-ui`, where it belongs

Re-ran the detectors: zero findings. Tagged this intermediate clean-but-not-restructured state as **`t1-fixed`**.

**Microfrontend restructuring**:
- Installed `@angular-architects/native-federation` on the shell app (`employeer-management-portal`), initialized as host
- Created 2 new Angular apps, each converted to a Native Federation remote:
  - `employees` (port 4201)
  - `leave` (port 4202)
- `time` deliberately kept inside the shell (not split) — 2 remotes was judged sufficient to demonstrate the pattern without adding unnecessary setup time
- Wired both remotes into the shell's `federation.config.mjs` and added lazy-loaded routes (`loadRemoteModule`) in the shell to load each remote

**Tagged**: `t2-restructured`

---

## Phase 6: Analysis tool UI

**Goal**: a minimal interface to run the analysis and view results, instead of using the terminal.

**Built**:
- `run-analysis.ts` refactored from a top-to-bottom script into an exported `runAnalysis(graphPath)` function, reusable by both the terminal and the server
- Generated separate graph snapshots for each tagged state: `graph-output-t0.json`, `graph-output-t1.json`, `graph-output-t2.json` (via checking out each tag and re-running `nx graph`)
- Small Express server (`server.ts`) exposing `GET /analyze/:state`, mapping `t0`/`t1`/`t2` to their respective snapshot files and calling `runAnalysis()`
- Minimal Angular app (`analyzer-ui`) with 3 buttons (one per state) that calls the API and lists findings with their AI explanations

**Result**: full pipeline working end-to-end through a UI — pick a state, see AI-explained architectural findings.

---

## Current status

All 6 phases functionally complete. Remaining work: expanding the tool's depth (in progress), running the formal evaluation (metrics across T0/T1/T2, human review study), and writing the thesis itself.
