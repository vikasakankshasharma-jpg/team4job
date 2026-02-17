
/**
 * @fileOverview This file defines a Genkit flow for generating comprehensive job details from a job title.
 *
 * It uses a prompt to instruct the LLM to create a detailed job description and suggest relevant skills.
 * It exports:
 * - `generateJobDetailsFlow`: The Genkit flow.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';
import {
  GenerateJobDetailsInputSchema,
  GenerateJobDetailsOutputSchema
} from './generate-job-details-schema';

const generateJobDetailsPrompt = ai.definePrompt({
  name: 'generateJobDetailsPrompt',
  model: 'googleai/gemini-2.0-flash',
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

export const generateJobDetailsFlow = defineLoggedFlow(
  {
    name: 'generateJobDetailsFlow',
    inputSchema: GenerateJobDetailsInputSchema,
    outputSchema: GenerateJobDetailsOutputSchema,
    cacheConfig: { enabled: true, ttlSeconds: 86400 }, // Cache for 24 hours
  },
  async (input: z.infer<typeof GenerateJobDetailsInputSchema>) => {
    const { output } = await generateJobDetailsPrompt(input);
    if (!output) {
      throw new Error("Failed to generate job details from AI.");
    }
    return output;
  }
);
