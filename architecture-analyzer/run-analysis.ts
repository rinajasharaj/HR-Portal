import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import OpenAI from 'openai';
import { saveRun } from './db';

const client = new OpenAI();

function getDomain(tags: string[]): string | undefined {
    const domainTag = tags.find(t => t.startsWith('domain:'));
    return domainTag?.split(':')[1];
}

function getType(tags: string[]): string | undefined {
    const typeTag = tags.find(t => t.startsWith('type:'));
    return typeTag?.split(':')[1];
}

async function explainFinding(evidence: any) {
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are an assistant explaining frontend architecture problems. Only use the facts given to you. Never invent details.' },
            { role: 'user', content: `Here is a detected architecture finding:\n${JSON.stringify(evidence, null, 2)}\n\nExplain this finding.` }
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'architecture_explanation',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        explanation: { type: 'string' },
                        consequences: { type: 'string' },
                        recommendedFix: { type: 'string' }
                    },
                    required: ['explanation', 'consequences', 'recommendedFix'],
                    additionalProperties: false
                }
            }
        }
    });

    return JSON.parse(response.choices[0].message.content!);
}

function validateResponse(evidence: any, aiResult: any, nodes: any): string[] {
    const warnings: string[] = [];

    const allowedNames = new Set<string>();
    for (const value of Object.values(evidence)) {
        if (typeof value === 'string') allowedNames.add(value.toLowerCase());
        if (Array.isArray(value)) value.forEach(v => typeof v === 'string' && allowedNames.add(v.toLowerCase()));
    }

    const allLibraryNames = Object.keys(nodes).map(n => n.toLowerCase());
    const fullText = (aiResult.explanation + ' ' + aiResult.consequences + ' ' + aiResult.recommendedFix).toLowerCase();

    for (const libName of allLibraryNames) {
        const mentionedInResponse = fullText.includes(libName);
        const wasInEvidence = allowedNames.has(libName);

        if (mentionedInResponse && !wasInEvidence) {
            warnings.push(`AI mentioned "${libName}" but it wasn't in the evidence sent to it`);
        }
    }

    return warnings;
}

export async function runAnalysis(graphPath: string) {
    const graphData = JSON.parse(readFileSync(graphPath, 'utf-8'));
    const nodes = graphData.graph.nodes;
    const dependencies = graphData.graph.dependencies;

    const allFindings: any[] = [];

    // Boundary violations
    for (const [source, deps] of Object.entries(dependencies)) {
        const depList = deps as any[];
        const sourceDomain = getDomain((nodes[source] as any).data.tags);

        for (const dep of depList) {
            const targetTags = (nodes[dep.target] as any).data.tags;
            const targetDomain = getDomain(targetTags);
            const targetType = getType(targetTags);

            const isCrossDomain = sourceDomain && targetDomain && sourceDomain !== targetDomain;
            const isNotShared = targetDomain !== 'shared';
            const skipsThePublicDoor = targetType !== 'domain-api';

            if (isCrossDomain && isNotShared && skipsThePublicDoor) {
                allFindings.push({
                    findingType: 'boundary-violation',
                    source, sourceDomain, target: dep.target, targetDomain, targetType,
                    rule: "libraries can only import another domain's domain-api, not its internal layers"
                });
            }
        }
    }

    // Untagged libraries
    for (const [name, node] of Object.entries(nodes)) {
        const tags = (node as any).data.tags;
        const type = (node as any).type;
        if (type === 'lib' && tags.length === 0) {
            allFindings.push({
                findingType: 'untagged-library',
                library: name,
                rule: 'every library should have a domain: and type: tag'
            });
        }
    }

    // Circular dependencies (domain level)
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

    const seenCycles = new Set<string>();
    for (const [domainA, targets] of Object.entries(domainDeps)) {
        for (const domainB of targets) {
            if (domainDeps[domainB]?.has(domainA)) {
                const key = [domainA, domainB].sort().join(',');
                if (!seenCycles.has(key)) {
                    seenCycles.add(key);
                    allFindings.push({
                        findingType: 'circular-dependency',
                        domainA, domainB,
                        rule: 'domains should not depend on each other in both directions'
                    });
                }
            }
        }
    }

    // God libraries (mixed-domain exports)
    const KNOWN_DOMAINS = ['employees', 'leave', 'time'];

    for (const [name, node] of Object.entries(nodes)) {
        const type = (node as any).type;
        if (type !== 'lib') continue;

        const ownDomain = getDomain((node as any).data.tags);
        const sourceRoot = (node as any).data.sourceRoot;
        const indexPath = `../employeer-management-portal/${sourceRoot}/index.ts`;

        try {
            const content = readFileSync(indexPath, 'utf-8');
            const exportLines = content.split('\n').filter(line => line.trim().startsWith('export'));
            const foreignDomainExports: string[] = [];

            for (const line of exportLines) {
                for (const domain of KNOWN_DOMAINS) {
                    if (line.toLowerCase().includes(domain) && domain !== ownDomain) {
                        foreignDomainExports.push(line.trim());
                    }
                }
            }

            if (foreignDomainExports.length > 0) {
                allFindings.push({
                    findingType: 'god-library',
                    library: name,
                    ownDomain: ownDomain ?? 'none',
                    foreignDomainExports,
                    rule: 'a library should not export code belonging to another known domain'
                });
            }
        } catch (e) {
            // no index.ts, skip
        }
    }

    // --- Send each finding to the AI and validate ---

    const analysisRun: any[] = [];

    for (const finding of allFindings) {
        const aiResult = await explainFinding(finding);
        const warnings = validateResponse(finding, aiResult, nodes);

        // analysisRun.push({
        //     evidence: finding,
        //     aiExplanation: aiResult,
        //     validationWarnings: warnings
        // });
        analysisRun.push({
            evidence: finding,
            aiExplanation: aiResult,
            validationWarnings: warnings
        });
    }

    const runId = saveRun(graphPath, analysisRun);
    console.log(`Saved analysis run #${runId} to database (${analysisRun.length} findings)`);

    return analysisRun;
}

// --- Allow running this file directly from the terminal, same as before ---

if (require.main === module) {
    runAnalysis('../employeer-management-portal/graph-output-03.json').then((analysisRun) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `analysis-run-${timestamp}.json`;
        writeFileSync(filename, JSON.stringify(analysisRun, null, 2));
        console.log(`Saved analysis run to ${filename} (${analysisRun.length} findings)`);
    });
}