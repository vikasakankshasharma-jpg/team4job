// 'use server'; removed to fix invalid export error

/**
 * @fileOverview This file defines a Genkit flow for suggesting relevant skills based on a job title and description.
 *
 * It helps Job Givers who may not know the technical terms for the skills required for their project.
 * It exports:
 * - `suggestSkills`: An async function that takes a job title/description and returns a list of suggested skills.
 * - `SuggestSkillsInput`: The input type for the `suggestSkills` function.
 * - `SuggestSkillsOutput`: The output type for the `suggestSkills` function.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestSkillsInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('The detailed description of the job.'),
  historicalContext: z.string().optional(),
});
export type SuggestSkillsInput = z.infer<typeof SuggestSkillsInputSchema>;

import { aiLearningService } from '@/ai/services/ai-learning.service';

const SuggestSkillsOutputSchema = z.object({
  skills: z.array(z.string()).describe('A list of suggested technical skills relevant to the job.'),
});
export type SuggestSkillsOutput = z.infer<typeof SuggestSkillsOutputSchema>;

export async function suggestSkills(input: SuggestSkillsInput): Promise<SuggestSkillsOutput> {
  return suggestSkillsFlow(input);
}

const suggestSkillsPrompt = ai.definePrompt({
  name: 'suggestSkillsPrompt',
  input: { schema: SuggestSkillsInputSchema },
  output: { schema: SuggestSkillsOutputSchema },
  prompt: `You are an expert in the CCTV and security installation industry.
  Based on the provided job title and description, identify and suggest a list of 5-7 relevant technical skills required to complete the job.
  Focus on specific, industry-standard terms.

  Job Title: {{{jobTitle}}}
  Job Description: {{{jobDescription}}}

  {{#if historicalContext}}
  **Successful Past Jobs (Reference):**
  {{{historicalContext}}}
  
  *Consider these past successes but adapt to the current specific description.*
  {{/if}}

  Return the skills as a simple JSON array of strings.
  `,
});

const suggestSkillsFlow = defineLoggedFlow(
  {
    name: 'suggestSkillsFlow',
    inputSchema: SuggestSkillsInputSchema,
    outputSchema: SuggestSkillsOutputSchema,
    modelTier: 'flash', // Cost-effective model for pattern matching
  },
  async (input: z.infer<typeof SuggestSkillsInputSchema>) => {
    let historicalContext = '';

    // RAG: Fetch "learned" examples
    try {
      const learnedExamples = await aiLearningService.getSuccessfulExamples(
        'skill_suggestion',
        `${input.jobTitle} ${input.jobDescription}`,
        3
      );

      if (learnedExamples.length > 0) {
        historicalContext += "Successful Past Jobs (High Rated):\n";
        learnedExamples.forEach(ex => {
          const outcome = ex.outcome;
          // If we have actual skills from a successful job
          if (outcome?.actualValue) {
            // outcome.actualValue should be array of strings (the final skills used)
            historicalContext += `- Job: "${ex.input.jobTitle}" | Skills Used: ${Array.isArray(outcome.actualValue) ? outcome.actualValue.join(', ') : outcome.actualValue}\n`;
          }
        });
      }
    } catch (error) {
      console.warn("Failed to fetch historical context for skill suggestion:", error);
    }

    const { output } = await suggestSkillsPrompt({
      ...input,
      historicalContext
    });

    // Log for future learning
    await aiLearningService.logInteraction(
      'skill_suggestion',
      input,
      output,
      undefined,
      'gemini-2.0-flash'
    );

    return output!;
  }
);
