import { readFileSync } from 'node:fs';
import {
    getDomain,
    getType,
    type GraphDependency,
    type GraphNode,
    type ProjectGraph,
} from './graph';
import { WORKSPACE_ROOT } from './workspace';

export interface Finding {
    findingType:
        | 'boundary-violation'
        | 'untagged-library'
        | 'circular-dependency'
        | 'god-library';
    [key: string]: unknown;
}

/** Domains we can recognise by name when scanning a library's barrel exports. */
const KNOWN_DOMAINS = ['employees', 'leave', 'time'];

/**
 * Runs all deterministic detectors against one already-loaded graph.
 * No AI, no side effects — just facts.
 *
 * NOTE: the god-library detector reads `index.ts` files from the current
 * working tree, so for historical snapshots it reflects today's source,
 * not the source at that point in history. The other three detectors read
 * the frozen graph and are correct per-state.
 */
export function detectFindings(graph: ProjectGraph): Finding[] {
    const { nodes, dependencies } = graph;

    return [
        ...boundaryViolations(nodes, dependencies),
        ...untaggedLibraries(nodes),
        ...circularDependencies(nodes, dependencies),
        ...godLibraries(nodes),
    ];
}

/** A library may only reach into another domain through its public `domain-api`. */
function boundaryViolations(
    nodes: Record<string, GraphNode>,
    dependencies: Record<string, GraphDependency[]>,
): Finding[] {
    const findings: Finding[] = [];

    for (const [source, deps] of Object.entries(dependencies)) {
        const sourceDomain = getDomain(nodes[source].data.tags);

        for (const dep of deps) {
            const targetTags = nodes[dep.target].data.tags;
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

    return findings;
}

/** Every library should carry a `domain:` and `type:` tag. */
function untaggedLibraries(nodes: Record<string, GraphNode>): Finding[] {
    const findings: Finding[] = [];

    for (const [name, node] of Object.entries(nodes)) {
        if (node.type === 'lib' && node.data.tags.length === 0) {
            findings.push({
                findingType: 'untagged-library',
                library: name,
                rule: 'every library should have a domain: and type: tag',
            });
        }
    }

    return findings;
}

/** Two domains must not depend on each other in both directions. */
function circularDependencies(
    nodes: Record<string, GraphNode>,
    dependencies: Record<string, GraphDependency[]>,
): Finding[] {
    const domainDeps: Record<string, Set<string>> = {};

    for (const [source, deps] of Object.entries(dependencies)) {
        const sourceDomain = getDomain(nodes[source].data.tags);
        if (!sourceDomain) continue;

        for (const dep of deps) {
            const targetDomain = getDomain(nodes[dep.target].data.tags);
            if (!targetDomain || targetDomain === sourceDomain) continue;
            (domainDeps[sourceDomain] ??= new Set()).add(targetDomain);
        }
    }

    const findings: Finding[] = [];
    const seenCycles = new Set<string>();

    for (const [domainA, targets] of Object.entries(domainDeps)) {
        for (const domainB of targets) {
            if (!domainDeps[domainB]?.has(domainA)) continue;

            const key = [domainA, domainB].sort().join(',');
            if (seenCycles.has(key)) continue;
            seenCycles.add(key);

            findings.push({
                findingType: 'circular-dependency',
                domainA,
                domainB,
                rule: 'domains should not depend on each other in both directions',
            });
        }
    }

    return findings;
}

/** A library must not export code that belongs to another known domain. */
function godLibraries(nodes: Record<string, GraphNode>): Finding[] {
    const findings: Finding[] = [];

    for (const [name, node] of Object.entries(nodes)) {
        if (node.type !== 'lib') continue;

        const ownDomain = getDomain(node.data.tags);
        const indexPath = `${WORKSPACE_ROOT}/${node.data.sourceRoot}/index.ts`;

        let content: string;
        try {
            content = readFileSync(indexPath, 'utf-8');
        } catch {
            continue; // library has no index.ts, skip
        }

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
    }

    return findings;
}
