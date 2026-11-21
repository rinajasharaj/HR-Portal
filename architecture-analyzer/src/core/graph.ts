import { readFileSync } from 'node:fs';

/**
 * The subset of `nx graph --file=...` output that the analyzer relies on.
 * The real file has much more; we only type what we read.
 */
export interface GraphNode {
    type: string; // 'lib' | 'app' | 'e2e' | ...
    data: {
        tags: string[];
        sourceRoot?: string;
    };
}

export interface GraphDependency {
    source: string;
    target: string;
    type: string;
}

export interface ProjectGraph {
    nodes: Record<string, GraphNode>;
    dependencies: Record<string, GraphDependency[]>;
}

/** Reads an Nx project-graph JSON snapshot from disk. */
export function loadGraph(graphPath: string): ProjectGraph {
    const raw = JSON.parse(readFileSync(graphPath, 'utf-8'));
    return {
        nodes: raw.graph.nodes,
        dependencies: raw.graph.dependencies,
    };
}

/** `['domain:employees', 'type:feature']` -> `'employees'` */
export function getDomain(tags: string[]): string | undefined {
    return tags.find((t) => t.startsWith('domain:'))?.split(':')[1];
}

/** `['domain:employees', 'type:feature']` -> `'feature'` */
export function getType(tags: string[]): string | undefined {
    return tags.find((t) => t.startsWith('type:'))?.split(':')[1];
}
