/**
 * AI analysis CLI.
 *
 * Runs the full pipeline (detectors -> LLM explanation -> validation) against a
 * graph snapshot and writes the result to
 * `output/samples/analysis-run-<timestamp>.json` (committed as thesis evidence).
 *
 * Usage:
 *   npm run analyze                              # default snapshot (graph-snapshots/graph-output-03.json)
 *   npm run analyze -- graph-snapshots/t1.json   # a specific snapshot
 *
 * Requires OPENAI_API_KEY in `.env`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { runAnalysis } from '../pipeline';
import { SNAPSHOTS_DIR } from '../core/workspace';

const DEFAULT_GRAPH = `${SNAPSHOTS_DIR}/graph-output-03.json`;
const OUTPUT_DIR = 'output/samples';

async function main() {
    const graphPath = process.argv[2] ?? DEFAULT_GRAPH;
    const results = await runAnalysis(graphPath);

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = `${OUTPUT_DIR}/analysis-run-${timestamp}.json`;
    writeFileSync(file, JSON.stringify(results, null, 2));

    console.log(`Saved analysis run to ${file} (${results.length} findings)`);
}

main();
