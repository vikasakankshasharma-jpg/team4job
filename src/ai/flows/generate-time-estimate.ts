
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { aiLearningService } from '@/ai/services/ai-learning.service';

// Input Schema
export const GenerateTimeEstimateInputSchema = z.object({
    jobTitle: z.string(),
    jobDescription: z.string(),
    jobCategory: z.string(),
});
export type GenerateTimeEstimateInput = z.infer<typeof GenerateTimeEstimateInputSchema>;

// Output Schema
export const GenerateTimeEstimateOutputSchema = z.object({
    timeEstimate: z.object({
        min: z.number().describe('Minimum estimated time in hours'),
        max: z.number().describe('Maximum estimated time in hours'),
        unit: z.enum(['hours', 'days', 'weeks']).describe('Unit of time for the estimate'),
    }),
    confidence: z.enum(['high', 'medium', 'low']),
    reasoning: z.string().describe('Explanation for the time estimate'),
    factors: z.array(z.string()).describe('Key factors influencing the time duration'),
});
export type GenerateTimeEstimateOutput = z.infer<typeof GenerateTimeEstimateOutputSchema>;

// Prompt Definition
const timeEstimatePrompt = ai.definePrompt({
    name: 'timeEstimatePrompt',
    model: 'googleai/gemini-2.0-flash',
    input: {
        schema: GenerateTimeEstimateInputSchema.extend({
            historicalContext: z.string().optional()
        })
    },
    output: { schema: GenerateTimeEstimateOutputSchema },
    prompt: `
    You are an expert project manager for security and CCTV installation services.
    Your task is to estimate the time required to complete the following job.

    **Job Details:**
    - **Title:** {{{jobTitle}}}
    - **Category:** {{{jobCategory}}}
    - **Description:** {{{jobDescription}}}

    {{#if historicalContext}}
    **Historical Data (Actual Completion Times of Similar Jobs):**
    {{{historicalContext}}}
    
    *Use this historical data to calibrate your estimate.*
    {{/if}}

    **Estimation Guidelines:**
    1.  **Labor:** Consider crew size usually needed (e.g., 2 technicians vs 1).
    2.  **Complexity:** Cabling length, height work, drilling, configuration.
    3.  **Buffer:** Include time for minor unforeseen delays.

    **Output:**
    - Provide a realistic Min/Max range.
    - Explain your reasoning.

    **Example:**
    - Input: "Install 4 CP Plus Cameras"
    - Output: { "timeEstimate": { "min": 4, "max": 6, "unit": "hours" }, "confidence": "high", "reasoning": "Standard 4 channel setup takes ~1-1.5 hours per camera including cabling." }
  `,
});

// Flow Definition
export const generateTimeEstimateFlow = ai.defineFlow(
    {
        name: 'generateTimeEstimateFlow',
        inputSchema: GenerateTimeEstimateInputSchema,
        outputSchema: GenerateTimeEstimateOutputSchema,
    },
    async (input) => {
        let historicalContext = '';

        // RAG: Fetch "learned" examples
        try {
            const learnedExamples = await aiLearningService.getSuccessfulExamples(
                'time_estimate',
                `${input.jobTitle} ${input.jobDescription}`,
                3
            );

            if (learnedExamples.length > 0) {
                historicalContext += "Similar Past Jobs:\n";
                learnedExamples.forEach(ex => {
                    const outcome = ex.outcome;
                    // If we have actual duration data (e.g., hours taken)
                    if (outcome?.actualValue) {
                        historicalContext += `- Job: "${ex.input.jobTitle}" | Estimated: ${ex.output.timeEstimate.min}-${ex.output.timeEstimate.max} ${ex.output.timeEstimate.unit} | Actual: ${outcome.actualValue} hours\n`;
                    }
                });
            }
        } catch (error) {
            console.warn("Failed to fetch historical context for time estimate:", error);
        }

        const { output } = await timeEstimatePrompt({
            ...input,
            historicalContext
        });

        if (!output) {
            throw new Error('AI failed to generate a time estimate.');
        }

        // Log for future learning
        await aiLearningService.logInteraction(
            'time_estimate',
            input,
            output,
            undefined,
            'gemini-2.0-flash'
        );

        return output;
    }
);
