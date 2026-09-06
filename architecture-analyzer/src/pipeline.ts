import { detectFindings, type Finding } from './core/detectors';
import { loadGraph } from './core/graph';
import { explainFinding, type AiExplanation } from './ai/explain';
import { validateResponse } from './ai/validate';

export interface AnalysisItem {
    evidence: Finding;
    aiExplanation: AiExplanation;
    validationWarnings: string[];
}

/**
 * Full pipeline for one graph snapshot:
 *   deterministic detectors -> LLM explanation -> ungrounded-claim check.
 */
export async function runAnalysis(graphPath: string): Promise<AnalysisItem[]> {
    const graph = loadGraph(graphPath);
    const findings = detectFindings(graph);

    const results: AnalysisItem[] = [];
    for (const finding of findings) {
        const aiExplanation = await explainFinding(finding);
        const validationWarnings = validateResponse(
            finding,
            aiExplanation,
            graph.nodes,
        );
        results.push({ evidence: finding, aiExplanation, validationWarnings });
    }

    return results;
}
