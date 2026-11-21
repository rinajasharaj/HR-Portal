# Verification guide

How to confirm the HR Portal + architecture-analyzer are healthy after the
badge refactor and the analyzer folder reorganisation.

Run the steps in order. Each step lists the command and what a **pass** looks
like. Stop at the first failure — later steps assume the earlier ones passed.

---

## 0. Fresh install

```bash
cd employeer-management-portal && npm ci
cd ../architecture-analyzer && npm ci
```

**Pass:** both complete with no peer-dependency or resolution errors.

---

## 1. Portal — the shared badge exists and nothing imports `leave-ui`

```bash
cd employeer-management-portal

# leave-ui is gone
test ! -d libs/leave/ui && echo "OK: libs/leave/ui removed"

# nothing references it any more
! grep -rn "leave-ui\|leave/ui\|LeaveStatusBadge" \
    --include='*.ts' --include='*.html' --include='*.json' \
    apps libs && echo "OK: no leave-ui references"

# the badge now lives in shared-ui
grep -q "badge/badge.component" libs/shared/ui/src/index.ts && echo "OK: shared-ui exports the badge"
```

**Pass:** all three `OK:` lines print.

---

## 2. Portal — project graph is clean

```bash
cd employeer-management-portal
npx nx show projects
```

**Pass:** the list has **15** projects and does **not** contain `leave-ui`.

---

## 3. Portal — lint (module boundaries)

```bash
cd employeer-management-portal
npx nx run-many -t lint -p employees-feature leave-feature shared-ui employeer-management-portal
```

**Pass:** `employees-feature`, `leave-feature`, and `employeer-management-portal`
report **no errors**.
`shared-ui` has **one pre-existing** error in `input.html`
(`label-has-associated-control`) — that is not from this change and can be
ignored (or fixed separately).

---

## 4. Portal — build

```bash
cd employeer-management-portal
npx nx build employeer-management-portal
```

**Pass:** build succeeds, `dist/apps/employeer-management-portal/` is produced,
no "cannot find module `@employeer-management-portal/leave-ui`" errors.

---

## 5. Portal — the badge renders in the running app

```bash
cd employeer-management-portal
npx nx serve employeer-management-portal
```

Open <http://localhost:4200>.

**Pass:**
- The **Dashboard → Recent activity** list shows coloured status pills
  ("Pending" amber, "Approved" green).
- Navigate to **Employees** → the table's **Status** column shows the same
  pills, and an employee profile page shows one too.
- Browser console has no errors about missing components or `lib-badge`.

Stop the server with `Ctrl+C` when done.

---

## 6. Analyzer — types compile

```bash
cd architecture-analyzer
npm run typecheck
```

**Pass:** exits 0, no output.

---

## 7. Analyzer — the CI guard passes

```bash
cd architecture-analyzer
npm run check
```

**Pass:**
- Ends with `✓ No architecture violations. Push allowed.`
- Exit code 0 (`echo $?`).
- It wrote `.cache/graph.json` (transient, git-ignored):
  ```bash
  test -f .cache/graph.json && git check-ignore -q .cache/graph.json && echo "OK: transient graph is git-ignored"
  ```

---

## 8. Analyzer — detectors still fire on the frozen snapshots

```bash
cd architecture-analyzer
for s in graph-snapshots/graph-output-t*.json; do
  echo "$s:"
  npx tsx -e "
    import {detectFindings} from './src/core/detectors';
    import {loadGraph} from './src/core/graph';
    const f = detectFindings(loadGraph('$s'));
    console.log('  ', f.length, 'finding(s)');
    for (const x of f) console.log('   -', x.findingType, x.source ?? x.library ?? x.domainA);
  "
done
```

**Pass (roughly):**
- `graph-output-t0.json` → **0** findings
- `graph-output-t1.json` → **5** findings (2 boundary, 2 untagged, 1 circular)
- `graph-output-t2.json` → **0** findings

This proves the deterministic engine still detects boundary, untagged, and
circular problems.

---

## 9. Analyzer — the AI pipeline runs end to end

Needs `OPENAI_API_KEY` in `architecture-analyzer/.env`. Makes ~1 real API call
(gpt-4o-mini, well under a cent).

```bash
cd architecture-analyzer
npm run analyze
```

**Pass:**
- Prints `Saved analysis run to output/samples/analysis-run-<timestamp>.json (1 findings)`.
- Open that file. It should contain one item with:
  - `evidence.findingType` = `"boundary-violation"` (the `employees-feature -> leave-ui`
    case, still present in the `graph-output-03.json` snapshot on purpose)
  - non-empty `aiExplanation.explanation` / `consequences` / `recommendedFix`
  - `validationWarnings: []`  ← empty means the model invented no library names

Run against a clean snapshot to confirm the 0-finding path (no API call):

```bash
npm run analyze -- graph-snapshots/graph-output-t0.json
```

**Pass:** prints `(0 findings)` and writes a file containing `[]`.
(Delete that empty file afterwards — it is noise:
`ls -t output/samples/*.json | head -1`.)

---

## 10. Analyzer — output lands in the tracked folder

```bash
cd architecture-analyzer
git status --porcelain output/samples/
```

**Pass:** newly created `output/samples/analysis-run-*.json` show as untracked
(`??`) — i.e. git **can** see them (they are no longer ignored). Commit or
delete as you see fit.

---

## 11. The pre-push hook fires

```bash
# from anywhere in the repo, with something staged/committed on a branch
git push --dry-run
```

**Pass:** you see `Regenerating the dependency graph...` and
`✓ No architecture violations` before the push proceeds. This is
`.husky/pre-push` running `cd architecture-analyzer && npm run check`.

---

## 12. Negative test — a real violation is actually caught

This proves the guard is not silently passing everything.

```bash
cd employeer-management-portal
# make employees-feature import leave internals again
sed -i '' "s#from '@employeer-management-portal/shared-ui'#from '@employeer-management-portal/leave-data-access'#" \
  libs/employees/feature/src/lib/employee-list/employee-list.ts
```

(or just hand-edit any feature lib to import another domain's non-`domain-api` lib)

```bash
cd ../architecture-analyzer
npm run check
```

**Pass:** exits **non-zero** with
`✗ PUSH BLOCKED — 1 architecture violation(s):` and lists the boundary
violation.

**Then undo it:**

```bash
cd ../employeer-management-portal && git checkout libs/employees/feature/src/lib/employee-list/employee-list.ts
cd ../architecture-analyzer && npm run check   # ✓ back to green
```

---

## 13. CI

Push the branch and open a PR. The **Architecture check** GitHub Action
(`.github/workflows/architecture-check.yml`) runs `npm run check` in
`architecture-analyzer`.

**Pass:** the check is green on the PR.

---

## Quick all-in-one

```bash
# portal
cd employeer-management-portal && npm ci \
  && npx nx run-many -t lint -p employees-feature leave-feature employeer-management-portal \
  && npx nx build employeer-management-portal

# analyzer
cd ../architecture-analyzer && npm ci \
  && npm run typecheck \
  && npm run check \
  && npm run analyze
```

If that chain finishes without a non-zero exit, everything is working.
