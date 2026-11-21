import type { Finding } from '../core/detectors';
import type { GraphNode } from '../core/graph';
import type { AiExplanation } from './explain';

/**
 * Cheap guard against ungrounded ("hallucinated") claims: flags any library
 * name the AI mentioned that was not part of the evidence we handed it.
 */
export function validateResponse(
    evidence: Finding,
    aiResult: AiExplanation,
    nodes: Record<string, GraphNode>,
): string[] {
    const allowedNames = new Set<string>();
    for (const value of Object.values(evidence)) {
        if (typeof value === 'string') {
            allowedNames.add(value.toLowerCase());
        } else if (Array.isArray(value)) {
            for (const v of value) {
                if (typeof v === 'string') allowedNames.add(v.toLowerCase());
            }
        }
    }

    const fullText =
        `${aiResult.explanation} ${aiResult.consequences} ${aiResult.recommendedFix}`.toLowerCase();

    const warnings: string[] = [];
    for (const libName of Object.keys(nodes).map((n) => n.toLowerCase())) {
        if (fullText.includes(libName) && !allowedNames.has(libName)) {
            warnings.push(
                `AI mentioned "${libName}" but it wasn't in the evidence sent to it`,
            );
        }
    }

    return warnings;
}
