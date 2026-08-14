import 'dotenv/config';
import OpenAI from 'openai';

const client = new OpenAI();

const evidence = {
    findingType: 'boundary-violation',
    source: 'leave-feature',
    sourceDomain: 'leave',
    target: 'employees-data-access',
    targetDomain: 'employees',
    targetType: 'data-access',
    rule: "libraries can only import another domain's domain-api, not its internal layers"
};

async function main() {
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: 'You are an assistant explaining frontend architecture problems. Only use the facts given to you. Never invent details.'
            },
            {
                role: 'user',
                content: `Here is a detected architecture finding:\n${JSON.stringify(evidence, null, 2)}\n\nExplain this finding.`
            }
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
                            description: 'What the problem is, in plain terms'
                        },
                        consequences: {
                            type: 'string',
                            description: 'Why this matters architecturally'
                        },
                        recommendedFix: {
                            type: 'string',
                            description: 'Concrete steps to fix it'
                        }
                    },
                    required: ['explanation', 'consequences', 'recommendedFix'],
                    additionalProperties: false
                }
            }
        }
    });

    const result = JSON.parse(response.choices[0].message.content!);
    console.log(JSON.stringify(result, null, 2));
}

main();