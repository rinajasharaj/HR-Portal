/**
 * CI / pre-push guard.
 *
 * Regenerates the dependency graph, runs the deterministic detectors, and
 * fails the process (exit 1) if *any* architecture finding is present.
 * No findings are tolerated — there is no baseline and no allow-list.
 *
 * Paths are resolved relative to the analyzer's working directory, so run it
 * from the `architecture-analyzer/` folder (that is what CI and husky do).
 */
import { execSync } from 'node:child_process';
import { detectFindings, type Finding } from '../core/detectors';
import { loadGraph } from '../core/graph';
import { GRAPH_FILE, GRAPH_PATH, WORKSPACE_ROOT } from '../core/workspace';

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

console.log('Regenerating the dependency graph...');
execSync(`npx nx graph --file=${GRAPH_FILE}`, {
    cwd: WORKSPACE_ROOT,
    stdio: 'inherit',
});

const findings = detectFindings(loadGraph(GRAPH_PATH));
const signatures = findings.map(signature).sort();

if (signatures.length > 0) {
    console.error(
        `\n✗ PUSH BLOCKED — ${signatures.length} architecture violation(s):\n`,
    );
    signatures.forEach((s) => console.error(`  - ${s}`));
    console.error('\nNo violations are tolerated. Fix them before pushing.\n');
    process.exit(1);
}

console.log('\n✓ No architecture violations. Push allowed.\n');
process.exit(0);
