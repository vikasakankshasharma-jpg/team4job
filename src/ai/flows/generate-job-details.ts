
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating comprehensive job details from a job title.
 *
 * It uses a prompt to instruct the LLM to create a detailed job description and suggest relevant skills.
 * It exports:
 * - `generateJobDetails`: An async function that takes a job title and returns a full set of job details.
 * - `GenerateJobDetailsInput`: The input type for the function.
 * - `GenerateJobDetailsOutput`: The output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateJobDetailsInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
});
export type GenerateJobDetailsInput = z.infer<typeof GenerateJobDetailsInputSchema>;

export const GenerateJobDetailsOutputSchema = z.object({
  jobDescription: z.string().describe('A detailed and compelling job description generated from the job title (150-250 words).'),
  suggestedSkills: z.array(z.string()).describe('A list of 5-7 relevant technical skills for the job.'),
});
export type GenerateJobDetailsOutput = z.infer<typeof GenerateJobDetailsOutputSchema>;

export async function generateJobDetails(input: GenerateJobDetailsInput): Promise<GenerateJobDetailsOutput> {
  return generateJobDetailsFlow(input);
}

const generateJobDetailsPrompt = ai.definePrompt({
  name: 'generateJobDetailsPrompt',
  input: { schema: GenerateJobDetailsInputSchema },
  output: { schema: GenerateJobDetailsOutputSchema },
  prompt: `You are an expert in the CCTV and security installation industry in India.
  Based on the job title provided, generate a comprehensive set of job details.

  Job Title: {{{jobTitle}}}

  1.  **Job Description:** Write a detailed and compelling job description (150-250 words). Include typical responsibilities, required expertise, and potential benefits. Make it sound professional and attractive to qualified installers.
  2.  **Suggested Skills:** Identify a list of 5-7 relevant technical skills. Use industry-standard terms.

  Return the full output in the specified JSON format.
  `,
});

const generateJobDetailsFlow = ai.defineFlow(
  {
    name: 'generateJobDetailsFlow',
    inputSchema: GenerateJobDetailsInputSchema,
    outputSchema: GenerateJobDetailsOutputSchema,
  },
  async input => {
    const { output } = await generateJobDetailsPrompt(input);
    if (!output) {
      throw new Error("Failed to generate job details from AI.");
    }
    return output;
  }
);
