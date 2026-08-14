import { readFileSync } from 'fs';

const graphData = JSON.parse(readFileSync('../employeer-management-portal/graph-output.json', 'utf-8'));

const nodes = graphData.graph.nodes;
const dependencies = graphData.graph.dependencies;

function getDomain(tags: string[]): string | undefined {
    const domainTag = tags.find(t => t.startsWith('domain:'));
    return domainTag?.split(':')[1];
}

function getType(tags: string[]): string | undefined {
    const typeTag = tags.find(t => t.startsWith('type:'));
    return typeTag?.split(':')[1];
}

// --- Boundary Violations (as evidence packages) ---

const boundaryViolations: any[] = [];

for (const [source, deps] of Object.entries(dependencies)) {
    const depList = deps as any[];
    const sourceTags = (nodes[source] as any).data.tags;
    const sourceDomain = getDomain(sourceTags);

    for (const dep of depList) {
        const targetTags = (nodes[dep.target] as any).data.tags;
        const targetDomain = getDomain(targetTags);
        const targetType = getType(targetTags);

        const isCrossDomain = sourceDomain && targetDomain && sourceDomain !== targetDomain;
        const isNotShared = targetDomain !== 'shared';
        const skipsThePublicDoor = targetType !== 'domain-api';

        if (isCrossDomain && isNotShared && skipsThePublicDoor) {
            boundaryViolations.push({
                findingType: 'boundary-violation',
                source: source,
                sourceDomain: sourceDomain,
                target: dep.target,
                targetDomain: targetDomain,
                targetType: targetType,
                rule: "libraries can only import another domain's domain-api, not its internal layers"
            });
        }
    }
}

console.log('--- Boundary Violations (evidence packages) ---');
console.log(JSON.stringify(boundaryViolations, null, 2));

// --- Circular Dependencies (domain level) ---

const domainDeps: Record<string, Set<string>> = {};

for (const [source, deps] of Object.entries(dependencies)) {
    const depList = deps as any[];
    const sourceDomain = getDomain((nodes[source] as any).data.tags);
    if (!sourceDomain) continue;

    for (const dep of depList) {
        const targetDomain = getDomain((nodes[dep.target] as any).data.tags);
        if (!targetDomain || targetDomain === sourceDomain) continue;

        if (!domainDeps[sourceDomain]) domainDeps[sourceDomain] = new Set();
        domainDeps[sourceDomain].add(targetDomain);
    }
}

const circularDependencies: any[] = [];
const seenCycles = new Set<string>();

for (const [domainA, targets] of Object.entries(domainDeps)) {
    for (const domainB of targets) {
        if (domainDeps[domainB]?.has(domainA)) {
            const key = [domainA, domainB].sort().join(',');
            if (!seenCycles.has(key)) {
                seenCycles.add(key);
                circularDependencies.push({
                    findingType: 'circular-dependency',
                    domainA: domainA,
                    domainB: domainB,
                    rule: 'domains should not depend on each other in both directions'
                });
            }
        }
    }
}

console.log('\n--- Circular Dependencies (evidence packages) ---');
console.log(JSON.stringify(circularDependencies, null, 2));

// --- Untagged Libraries ---

const untaggedLibraries: any[] = [];

for (const [name, node] of Object.entries(nodes)) {
    const tags = (node as any).data.tags;
    const type = (node as any).type;

    if (type === 'lib' && tags.length === 0) {
        untaggedLibraries.push({
            findingType: 'untagged-library',
            library: name,
            rule: 'every library should have a domain: and type: tag'
        });
    }
}

console.log('\n--- Untagged Libraries (evidence packages) ---');
console.log(JSON.stringify(untaggedLibraries, null, 2));

// --- God Libraries (heuristic: mixed-domain exports) ---

const KNOWN_DOMAINS = ['employees', 'leave', 'time'];
const godLibraries: any[] = [];

for (const [name, node] of Object.entries(nodes)) {
    const type = (node as any).type;
    if (type !== 'lib') continue;

    const tags = (node as any).data.tags;
    const ownDomain = getDomain(tags);
    const sourceRoot = (node as any).data.sourceRoot;
    const indexPath = `../employeer-management-portal/${sourceRoot}/index.ts`;

    try {
        const content = readFileSync(indexPath, 'utf-8');
        const exportLines = content.split('\n').filter(line => line.trim().startsWith('export'));

        const foreignDomainExports: string[] = [];

        for (const line of exportLines) {
            for (const domain of KNOWN_DOMAINS) {
                const mentionsThisDomain = line.toLowerCase().includes(domain);
                const belongsToDifferentDomain = domain !== ownDomain;

                if (mentionsThisDomain && belongsToDifferentDomain) {
                    foreignDomainExports.push(line.trim());
                }
            }
        }

        if (foreignDomainExports.length > 0) {
            godLibraries.push({
                findingType: 'god-library',
                library: name,
                ownDomain: ownDomain ?? 'none',
                foreignDomainExports: foreignDomainExports,
                rule: 'a library should not export code belonging to another known domain'
            });
        }
    } catch (e) {
        // no index.ts, skip
    }
}

console.log('\n--- God Libraries (evidence packages) ---');
console.log(JSON.stringify(godLibraries, null, 2));