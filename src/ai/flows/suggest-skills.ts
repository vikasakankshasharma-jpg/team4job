'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting relevant skills based on a job title and description.
 *
 * It helps Job Givers who may not know the technical terms for the skills required for their project.
 * It exports:
 * - `suggestSkills`: An async function that takes a job title/description and returns a list of suggested skills.
 * - `SuggestSkillsInput`: The input type for the `suggestSkills` function.
 * - `SuggestSkillsOutput`: The output type for the `suggestSkills` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSkillsInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('The detailed description of the job.'),
});
export type SuggestSkillsInput = z.infer<typeof SuggestSkillsInputSchema>;

const SuggestSkillsOutputSchema = z.object({
  skills: z.array(z.string()).describe('A list of suggested technical skills relevant to the job.'),
});
export type SuggestSkillsOutput = z.infer<typeof SuggestSkillsOutputSchema>;

export async function suggestSkills(input: SuggestSkillsInput): Promise<SuggestSkillsOutput> {
  return suggestSkillsFlow(input);
}

const suggestSkillsPrompt = ai.definePrompt({
  name: 'suggestSkillsPrompt',
  input: {schema: SuggestSkillsInputSchema},
  output: {schema: SuggestSkillsOutputSchema},
  prompt: `You are an expert in the CCTV and security installation industry.
  Based on the provided job title and description, identify and suggest a list of 5-7 relevant technical skills required to complete the job.
  Focus on specific, industry-standard terms.

  Job Title: {{{jobTitle}}}
  Job Description: {{{jobDescription}}}

  Return the skills as a simple JSON array of strings.
  `,
});

const suggestSkillsFlow = ai.defineFlow(
  {
    name: 'suggestSkillsFlow',
    inputSchema: SuggestSkillsInputSchema,
    outputSchema: SuggestSkillsOutputSchema,
  },
  async input => {
    const {output} = await suggestSkillsPrompt(input);
    return output!;
  }
);
