import 'dotenv/config';
import OpenAI from 'openai';
import type { Finding } from '../core/detectors';

// Constructed lazily (not at module load) so a missing OPENAI_API_KEY throws
// inside explainFinding() — where callers can catch it — rather than crashing
// the process as soon as this module is imported.
let client: OpenAI | undefined;
function getClient(): OpenAI {
    if (!client) client = new OpenAI();
    return client;
}

export interface AiExplanation {
    /** What the problem is, in plain terms. */
    explanation: string;
    /** Why this matters architecturally. */
    consequences: string;
    /** Concrete steps to fix it. */
    recommendedFix: string;
}

/**
 * Sends one detector finding to the LLM and returns a structured explanation.
 * The prompt forbids inventing facts; {@link validateResponse} double-checks that.
 */
export async function explainFinding(evidence: Finding): Promise<AiExplanation> {
    const response = await getClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content:
                    'You are an assistant explaining frontend architecture problems. Only use the facts given to you. Never invent details.',
            },
            {
                role: 'user',
                content: `Here is a detected architecture finding:\n${JSON.stringify(
                    evidence,
                    null,
                    2,
                )}\n\nExplain this finding.`,
            },
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'architecture_explanation',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        explanation: {
                            type: 'string',
                            description: 'What the problem is, in plain terms',
                        },
                        consequences: {
                            type: 'string',
                            description: 'Why this matters architecturally',
                        },
                        recommendedFix: {
                            type: 'string',
                            description: 'Concrete steps to fix it',
                        },
                    },
                    required: ['explanation', 'consequences', 'recommendedFix'],
                    additionalProperties: false,
                },
            },
        },
    });

    return JSON.parse(response.choices[0].message.content!);
}
