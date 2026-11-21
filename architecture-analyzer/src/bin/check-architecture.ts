/**
 * CI / pre-push guard.
 *
 * Regenerates the dependency graph, runs the deterministic detectors, and
 * fails the process (exit 1) if *any* architecture finding is present.
 * No findings are tolerated — there is no baseline and no allow-list.
 *
 * When violations are found, each one is also sent to the LLM for a plain-
 * language explanation, printed to the logs alongside the raw finding. The
 * AI step is best-effort: if it fails (e.g. no OPENAI_API_KEY), the push is
 * still blocked on the deterministic findings alone.
 *
 * Paths are resolved relative to the analyzer's working directory, so run it
 * from the `architecture-analyzer/` folder (that is what CI and husky do).
 */
import { execSync } from 'node:child_process';
import { detectFindings, type Finding } from '../core/detectors';
import { loadGraph } from '../core/graph';
import { GRAPH_FILE, GRAPH_PATH, WORKSPACE_ROOT } from '../core/workspace';
import { explainFinding } from '../ai/explain';
import { validateResponse } from '../ai/validate';

/** A short, stable string that identifies one finding. */
function signature(f: Finding): string {
    switch (f.findingType) {
        case 'boundary-violation':
            return `boundary-violation | ${f.source} -> ${f.target}`;
        case 'circular-dependency':
            return `circular-dependency | ${[f.domainA, f.domainB].sort().join(' <-> ')}`;
        case 'untagged-library':
            return `untagged-library | ${f.library}`;
        case 'god-library':
            return `god-library | ${f.library}`;
        default:
            return `${f.findingType} | ${JSON.stringify(f)}`;
    }
}

async function main() {
    console.log('Regenerating the dependency graph...');
    execSync(`npx nx graph --file=${GRAPH_FILE}`, {
        cwd: WORKSPACE_ROOT,
        stdio: 'inherit',
    });

    const graph = loadGraph(GRAPH_PATH);
    const findings = detectFindings(graph);
    const signatures = findings.map(signature).sort();

    if (signatures.length > 0) {
        console.error(
            `\n✗ PUSH BLOCKED — ${signatures.length} architecture violation(s):\n`,
        );
        signatures.forEach((s) => console.error(`  - ${s}`));

        console.error('\nAI explanation:\n');
        for (const finding of findings) {
            console.error(`  - ${signature(finding)}`);
            try {
                const aiExplanation = await explainFinding(finding);
                const warnings = validateResponse(finding, aiExplanation, graph.nodes);
                console.error(`    ${aiExplanation.explanation}`);
                console.error(`    Why it matters: ${aiExplanation.consequences}`);
                console.error(`    Fix: ${aiExplanation.recommendedFix}`);
                warnings.forEach((w) => console.error(`    ⚠ ${w}`));
            } catch (err) {
                console.error(
                    `    (AI explanation unavailable: ${(err as Error).message})`,
                );
            }
            console.error('');
        }

        console.error('No violations are tolerated. Fix them before pushing.\n');
        process.exit(1);
    }

    console.log('\n✓ No architecture violations. Push allowed.\n');
    process.exit(0);
}

main();
