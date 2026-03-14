
import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeUserPatternsInputSchema = z.object({
    userId: z.string(),
    recentJobs: z.array(z.any()).describe('The last 5-10 jobs posted by the user.'),
});

const PatternSuggestionSchema = z.object({
    patternFound: z.boolean(),
    templateName: z.string().optional(),
    templateDescription: z.string().optional(),
    suggestedAnswers: z.record(z.string(), z.any()).optional(),
    reasoning: z.string().optional().describe('Why this pattern was suggested.'),
});

const AnalyzeUserPatternsOutputSchema = z.object({
    suggestion: PatternSuggestionSchema.optional(),
});

export type AnalyzeUserPatternsInput = z.infer<typeof AnalyzeUserPatternsInputSchema>;
export type AnalyzeUserPatternsOutput = z.infer<typeof AnalyzeUserPatternsOutputSchema>;

const analyzeUserPatternsPrompt = ai.definePrompt({
    name: 'analyzeUserPatternsPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: AnalyzeUserPatternsInputSchema },
    output: { schema: AnalyzeUserPatternsOutputSchema },
    prompt: `
  You are an AI assistant for a job marketplace. Your goal is to help users save time by suggesting reusable templates based on their posting history.
  
  Recent Jobs Data:
  {{json recentJobs}}
  
  Instructions:
  1. **Analyze for Repetition**: Look at the configurations in the recent jobs (camera count, location type, wiring status, etc.).
  2. **Threshold**: If at least 3 of the last 5-10 jobs share a very similar configuration (more than 70% match in field values), identify it as a pattern.
  3. **Generate Suggestion**:
     - **templateName**: A descriptive name (e.g., "Frequent 4-Camera Shop Setup").
     - **templateDescription**: Why this is being suggested (e.g., "You've posted this exact configuration 4 times recently.").
     - **suggestedAnswers**: The common field values of the pattern.
  4. **Strict JSON**: Only return a suggestion if a clear pattern is found. Otherwise, set 'patternFound' to false.
  `,
});

export const analyzeUserPatternsFlow = defineLoggedFlow(
    {
        name: 'analyzeUserPatternsFlow',
        inputSchema: AnalyzeUserPatternsInputSchema,
        outputSchema: AnalyzeUserPatternsOutputSchema,
        cacheConfig: { enabled: true, ttlSeconds: 86400 }, // Long cache for pattern analysis
    },
    async (input) => {
        if (!input.recentJobs || input.recentJobs.length < 3) {
            return { suggestion: { patternFound: false } };
        }
        const { output } = await analyzeUserPatternsPrompt(input);
        return output!;
    }
);
