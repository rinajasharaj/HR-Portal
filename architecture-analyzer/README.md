# Architecture Analyzer

A tool that analyzes an Nx monorepo's architecture and uses an LLM to explain
detected problems. Built as part of a bachelor thesis on AI-assisted architecture
analysis for enterprise frontend applications.

## What it does

1. Reads an Nx project graph (libraries, tags, dependencies)
2. Runs 4 deterministic detectors to find architecture problems
3. Sends each finding to an LLM (OpenAI) as a structured "evidence package"
4. The LLM explains the problem, its consequences, and a fix — grounded strictly
   in the evidence, never inventing facts
5. Validates the LLM's response against the evidence to catch ungrounded claims

## Detectors

- **Boundary violation** — a library imports another domain's internal layers instead of its public `domain-api`
- **Circular dependency** — two domains depend on each other in both directions
- **Untagged library** — a library is missing its `domain:` and `type:` tags
- **God library** — a library exports code that belongs to a different known domain

## Layout

```
src/
  core/                 deterministic, AI-free, reusable
    graph.ts            load an Nx graph snapshot + tag helpers
    detectors.ts        the 4 detectors -> Finding[]
  ai/                   everything that talks to the LLM
    explain.ts          explainFinding(evidence) -> { explanation, consequences, recommendedFix }
    validate.ts         validateResponse(...) -> warnings about ungrounded claims
  analyze.ts            runAnalysis(): core + ai pipeline for one snapshot
  bin/                  entry points
    check-architecture.ts   CI / pre-push guard (detectors + baseline, no AI)
    analyze.ts              AI report -> output/analysis-run-<timestamp>.json

architecture-baseline.json   accepted findings the CI guard compares against
output/samples/              example analysis runs kept as thesis evidence
```

## Usage

Run everything from this folder.

```bash
# CI guard: fail if a new architecture violation appears (used by CI + pre-push hook)
npm run check

# accept the current findings as the new baseline
npm run check:update-baseline

# full AI analysis of a graph snapshot (needs OPENAI_API_KEY)
npm run analyze                          # default snapshot
npm run analyze -- ../employeer-management-portal/graph-output-t1.json
```

## Requirements

- `npm ci` in this folder, and in `../employeer-management-portal` (the graph is
  regenerated with that workspace's `nx`)
- An `OPENAI_API_KEY` in `.env` (only for `npm run analyze`)
