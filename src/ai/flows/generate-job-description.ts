'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating compelling job descriptions from a job title.
 *
 * The flow uses a prompt to instruct the LLM to create a detailed and attractive job description based on the provided title.
 * It exports:
 * - `generateJobDescription`: An async function that takes a job title as input and returns a generated job description.
 * - `GenerateJobDescriptionInput`: The input type for the `generateJobDescription` function (a job title string).
 * - `GenerateJobDescriptionOutput`: The output type for the `generateJobDescription` function (a job description string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJobDescriptionInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
});
export type GenerateJobDescriptionInput = z.infer<typeof GenerateJobDescriptionInputSchema>;

const GenerateJobDescriptionOutputSchema = z.object({
  jobDescription: z.string().describe('A detailed and compelling job description generated from the job title.'),
});
export type GenerateJobDescriptionOutput = z.infer<typeof GenerateJobDescriptionOutputSchema>;

export async function generateJobDescription(input: GenerateJobDescriptionInput): Promise<GenerateJobDescriptionOutput> {
  return generateJobDescriptionFlow(input);
}

const generateJobDescriptionPrompt = ai.definePrompt({
  name: 'generateJobDescriptionPrompt',
  input: {schema: GenerateJobDescriptionInputSchema},
  output: {schema: GenerateJobDescriptionOutputSchema},
  prompt: `You are an expert in writing job descriptions that attract qualified candidates.
  Based on the job title provided, create a detailed and compelling job description.
  The description should be approximately 150-250 words and should include information about the responsibilities, required skills, and benefits of the job. Make it sound exciting and professional.

  Job Title: {{{jobTitle}}}
  `,
});

const generateJobDescriptionFlow = ai.defineFlow(
  {
    name: 'generateJobDescriptionFlow',
    inputSchema: GenerateJobDescriptionInputSchema,
    outputSchema: GenerateJobDescriptionOutputSchema,
  },
  async input => {
    const {output} = await generateJobDescriptionPrompt(input);
    return output!;
  }
);
