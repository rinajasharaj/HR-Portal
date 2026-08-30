import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { detectFindings } from './detectors';

const GRAPH_PATH = '../employeer-management-portal/graph-output.json';
const BASELINE_PATH = 'architecture-baseline.json';

/** A short, stable string that identifies one finding. */
function signature(f: any): string {
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

function currentSignatures(): string[] {
    console.log('Regenerating the dependency graph...');
    execSync('npx nx graph --file=graph-output.json', {
        cwd: '../employeer-management-portal',
        stdio: 'inherit',
    });
    return detectFindings(GRAPH_PATH).map(signature).sort();
}

// --- Mode 1: update the baseline ---

if (process.argv.includes('--update-baseline')) {
    const signatures = currentSignatures();
    writeFileSync(
        BASELINE_PATH,
        JSON.stringify(
            { generatedAt: new Date().toISOString(), acceptedFindings: signatures },
            null,
            2,
        ) + '\n',
    );
    console.log(`\nBaseline updated: ${signatures.length} accepted finding(s).`);
    signatures.forEach((s) => console.log(`  - ${s}`));
    process.exit(0);
}

// --- Mode 2: check against the baseline (default) ---

if (!existsSync(BASELINE_PATH)) {
    console.error(
        `\nNo ${BASELINE_PATH} found. Create one first:\n` +
        `  npx tsx check-architecture.ts --update-baseline\n`,
    );
    process.exit(1);
}

const baseline: string[] = JSON.parse(
    readFileSync(BASELINE_PATH, 'utf-8'),
).acceptedFindings;
const baselineSet = new Set(baseline);

const current = currentSignatures();
const newViolations = current.filter((s) => !baselineSet.has(s));
const fixed = baseline.filter((s) => !current.includes(s));

console.log(
    `\nBaseline: ${baseline.length} accepted finding(s). Current: ${current.length} finding(s).`,
);

if (fixed.length > 0) {
    console.log(
        '\nNote: these baseline findings are no longer present (consider --update-baseline):',
    );
    fixed.forEach((s) => console.log(`  - ${s}`));
}

if (newViolations.length > 0) {
    console.error('\n✗ PUSH BLOCKED — new architecture violation(s) not in the baseline:\n');
    newViolations.forEach((s) => console.error(`  - ${s}`));
    console.error(
        '\nFix them, or if intentional run:  npm run check:architecture -- --update-baseline\n',
    );
    process.exit(1);
}

console.log('\n✓ No new architecture violations. Push allowed.\n');
process.exit(0);