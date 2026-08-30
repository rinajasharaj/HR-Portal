import { readFileSync } from 'fs';

const graphData = JSON.parse(readFileSync('../employeer-management-portal/graph-output-03.json', 'utf-8'));

const nodes = graphData.graph.nodes;
const dependencies = graphData.graph.dependencies;

console.log('--- Tags ---');
for (const [name, node] of Object.entries(nodes)) {
    console.log(name, '-> tags:', (node as any).data.tags);
}

console.log('\n--- Dependencies ---');
for (const [source, deps] of Object.entries(dependencies)) {
    const depList = deps as any[];
    if (depList.length > 0) {
        for (const dep of depList) {
            console.log(dep.source, '->', dep.target);
        }
    }
}

function getDomain(tags: string[]): string | undefined {
    const domainTag = tags.find(t => t.startsWith('domain:'));
    return domainTag?.split(':')[1];
}

function getType(tags: string[]): string | undefined {
    const typeTag = tags.find(t => t.startsWith('type:'));
    return typeTag?.split(':')[1];
}

console.log('\n--- Boundary Violations ---');

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
            console.log(`VIOLATION: ${source} (domain:${sourceDomain}) imports ${dep.target} (domain:${targetDomain}, type:${targetType}) - bypasses domain-api`);
        }
    }
}

console.log('\n--- Circular Dependencies (domain level) ---');

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

for (const [domainA, targets] of Object.entries(domainDeps)) {
    for (const domainB of targets) {
        if (domainDeps[domainB]?.has(domainA)) {
            console.log(`CYCLE: domain:${domainA} <-> domain:${domainB}`);
        }
    }
}

console.log('\n--- Untagged Libraries ---');

for (const [name, node] of Object.entries(nodes)) {
    const tags = (node as any).data.tags;
    const type = (node as any).type;

    if (type === 'lib' && tags.length === 0) {
        console.log(`UNTAGGED: ${name}`);
    }
}

import { readdirSync } from 'fs';

console.log('\n--- God Libraries (heuristic: high export count) ---');

const GOD_LIBRARY_THRESHOLD = 3;

for (const [name, node] of Object.entries(nodes)) {
    const type = (node as any).type;
    if (type !== 'lib') continue;

    const sourceRoot = (node as any).data.sourceRoot;
    const indexPath = `../employeer-management-portal/${sourceRoot}/index.ts`;

    try {
        const content = readFileSync(indexPath, 'utf-8');
        const exportLines = content.split('\n').filter(line => line.trim().startsWith('export'));

        if (exportLines.length >= GOD_LIBRARY_THRESHOLD) {
            console.log(`GOD LIBRARY: ${name} - ${exportLines.length} exports (threshold: ${GOD_LIBRARY_THRESHOLD})`);
        }
    } catch (e) {
        // library has no index.ts or it's empty, skip
    }
}

console.log('\n--- God Libraries (heuristic: mixed-domain exports) ---');

const KNOWN_DOMAINS = ['employees', 'leave', 'time'];

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
            console.log(`GOD LIBRARY: ${name} (own domain: ${ownDomain ?? 'none'}) contains foreign-domain code:`);
            for (const line of foreignDomainExports) {
                console.log(`   - ${line}`);
            }
        }
    } catch (e) {
        // no index.ts, skip
    }
}