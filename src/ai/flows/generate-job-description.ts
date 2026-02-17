// 'use server'; removed to fix invalid export error

/**
 * @fileOverview This file defines a Genkit flow for generating compelling job descriptions from a job title.
 *
 * The flow uses a prompt to instruct the LLM to create a detailed and attractive job description based on the provided title.
 * It exports:
 * - `generateJobDescription`: An async function that takes a job title as input and returns a generated job description.
 * - `GenerateJobDescriptionInput`: The input type for the `generateJobDescription` function (a job title string).
 * - `GenerateJobDescriptionOutput`: The output type for the `generateJobDescription` function (a job description string).
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

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

// Internal schema for the prompt (includes RAG context)
const PromptInputSchema = GenerateJobDescriptionInputSchema.extend({
  context: z.string().optional().describe('Relevant context from similar past successful jobs.'),
});

const generateJobDescriptionPrompt = ai.definePrompt({
  name: 'generateJobDescriptionPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: GenerateJobDescriptionOutputSchema },
  prompt: `You are an expert in writing job descriptions that attract qualified candidates.
  Based on the job title provided, create a detailed and compelling job description.
  The description should be approximately 150-250 words and should include information about the responsibilities, required skills, and benefits of the job. Make it sound exciting and professional.

  {{#if context}}
  IMPORTANT: Use the following context from similar successful jobs to guide the tone and content, but adapt it to the specific title:
  {{context}}
  {{/if}}

  Job Title: {{{jobTitle}}}
  `,
});

const generateJobDescriptionFlow = defineLoggedFlow(
  {
    name: 'generateJobDescriptionFlow',
    inputSchema: GenerateJobDescriptionInputSchema,
    outputSchema: GenerateJobDescriptionOutputSchema,
    cacheConfig: { enabled: true, ttlSeconds: 86400 }, // Cache for 24 hours
  },
  async (input: z.infer<typeof GenerateJobDescriptionInputSchema>) => {
    const { aiKnowledgeService } = await import('@/ai/services/AIKnowledgeService');

    let context = '';
    try {
      // RAG: Fetch similar jobs
      const docs = await aiKnowledgeService.searchSimilar(input.jobTitle, 2);
      if (docs.length > 0) {
        context = docs.map(d => `- ${d.content}`).join('\n');
        console.log(`[RAG] Found ${docs.length} context docs for "${input.jobTitle}"`);
      }
    } catch (err) {
      console.warn("[RAG] Failed to retrieve context:", err);
      // Continue without context
    }

    const { output } = await generateJobDescriptionPrompt({
      jobTitle: input.jobTitle,
      context
    });
    return output!;
  }
);
