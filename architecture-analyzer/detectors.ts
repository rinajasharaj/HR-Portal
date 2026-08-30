import { readFileSync } from 'fs';

export interface Finding {
    findingType:
        | 'boundary-violation'
        | 'untagged-library'
        | 'circular-dependency'
        | 'god-library';
    [key: string]: unknown;
}

function getDomain(tags: string[]): string | undefined {
    return tags.find((t) => t.startsWith('domain:'))?.split(':')[1];
}

function getType(tags: string[]): string | undefined {
    return tags.find((t) => t.startsWith('type:'))?.split(':')[1];
}

const KNOWN_DOMAINS = ['employees', 'leave', 'time'];

/**
 * Runs all deterministic detectors against one graph snapshot.
 * No AI, no side effects — just facts.
 *
 * NOTE: the god-library detector reads `index.ts` files from the current
 * working tree, so for historical snapshots it reflects today's source,
 * not the source at that point in history. The other three detectors read
 * the frozen graph JSON and are correct per-state.
 */
export function detectFindings(graphPath: string): Finding[] {
    const graphData = JSON.parse(readFileSync(graphPath, 'utf-8'));
    const nodes = graphData.graph.nodes;
    const dependencies = graphData.graph.dependencies;

    const findings: Finding[] = [];

    // 1. Boundary violations
    for (const [source, deps] of Object.entries(dependencies)) {
        const sourceDomain = getDomain((nodes[source] as any).data.tags);

        for (const dep of deps as any[]) {
            const targetTags = (nodes[dep.target] as any).data.tags;
            const targetDomain = getDomain(targetTags);
            const targetType = getType(targetTags);

            const isCrossDomain =
                sourceDomain && targetDomain && sourceDomain !== targetDomain;
            const isNotShared = targetDomain !== 'shared';
            const skipsThePublicDoor = targetType !== 'domain-api';

            if (isCrossDomain && isNotShared && skipsThePublicDoor) {
                findings.push({
                    findingType: 'boundary-violation',
                    source,
                    sourceDomain,
                    target: dep.target,
                    targetDomain,
                    targetType,
                    rule: "libraries can only import another domain's domain-api, not its internal layers",
                });
            }
        }
    }

    // 2. Untagged libraries
    for (const [name, node] of Object.entries(nodes)) {
        const tags = (node as any).data.tags;
        if ((node as any).type === 'lib' && tags.length === 0) {
            findings.push({
                findingType: 'untagged-library',
                library: name,
                rule: 'every library should have a domain: and type: tag',
            });
        }
    }

    // 3. Circular dependencies (domain level)
    const domainDeps: Record<string, Set<string>> = {};

    for (const [source, deps] of Object.entries(dependencies)) {
        const sourceDomain = getDomain((nodes[source] as any).data.tags);
        if (!sourceDomain) continue;

        for (const dep of deps as any[]) {
            const targetDomain = getDomain((nodes[dep.target] as any).data.tags);
            if (!targetDomain || targetDomain === sourceDomain) continue;
            (domainDeps[sourceDomain] ??= new Set()).add(targetDomain);
        }
    }

    const seenCycles = new Set<string>();
    for (const [domainA, targets] of Object.entries(domainDeps)) {
        for (const domainB of targets) {
            if (domainDeps[domainB]?.has(domainA)) {
                const key = [domainA, domainB].sort().join(',');
                if (!seenCycles.has(key)) {
                    seenCycles.add(key);
                    findings.push({
                        findingType: 'circular-dependency',
                        domainA,
                        domainB,
                        rule: 'domains should not depend on each other in both directions',
                    });
                }
            }
        }
    }

    // 4. God libraries (mixed-domain exports) — source-based, see NOTE above
    for (const [name, node] of Object.entries(nodes)) {
        if ((node as any).type !== 'lib') continue;

        const ownDomain = getDomain((node as any).data.tags);
        const sourceRoot = (node as any).data.sourceRoot;
        const indexPath = `../employeer-management-portal/${sourceRoot}/index.ts`;

        try {
            const content = readFileSync(indexPath, 'utf-8');
            const exportLines = content
                .split('\n')
                .filter((line) => line.trim().startsWith('export'));

            const foreignDomainExports: string[] = [];
            for (const line of exportLines) {
                for (const domain of KNOWN_DOMAINS) {
                    if (line.toLowerCase().includes(domain) && domain !== ownDomain) {
                        foreignDomainExports.push(line.trim());
                    }
                }
            }

            if (foreignDomainExports.length > 0) {
                findings.push({
                    findingType: 'god-library',
                    library: name,
                    ownDomain: ownDomain ?? 'none',
                    foreignDomainExports,
                    rule: 'a library should not export code belonging to another known domain',
                });
            }
        } catch {
            // library has no index.ts, skip
        }
    }

    return findings;
}