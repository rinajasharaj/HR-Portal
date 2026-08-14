# Architecture Analyzer

A tool that analyzes an Nx monorepo's architecture and uses an LLM to explain detected problems. Built as part of a bachelor thesis on AI-assisted architecture analysis for enterprise frontend applications.

## What it does

1. Reads an Nx project graph (libraries, tags, dependencies)
2. Runs 4 deterministic detectors to find architecture problems
3. Sends each finding to an LLM (OpenAI) as a structured "evidence package"
4. The LLM explains the problem, its consequences, and a fix — grounded strictly in the evidence, never inventing facts
5. Validates the LLM's response against the evidence to catch ungrounded claims

## Detectors

- **Boundary violation** — a library imports another domain's internal layers instead of its public `domain-api`
- **Circular dependency** — two domains depend on each other in both directions
- **Untagged library** — a library is missing its `domain:` and `type:` tags
- **God library** — a library exports code that belongs to a different known domain

## Project structure

- `run-analysis.ts` — core logic: extraction, detectors, evidence packages, AI calls, validation
- `server.ts` — small Express API exposing `/analyze/:state` (t0 / t1 / t2)
- `apps/analyzer-ui` — small Angular UI for running an analysis and viewing results

## Running it

**Backend:**
```bash
node --import tsx server.ts
```

**Frontend:**
```bash
npx nx serve analyzer-ui
```

Then open the UI and pick a state (T0 = clean, T1 = eroded, T2 = restructured).

## Requirements

- An `OPENAI_API_KEY` in `.env`
- Graph snapshots (`graph-output-t0.json`, `graph-output-t1.json`, `graph-output-t2.json`) generated via `nx graph --file=...` at each git tag