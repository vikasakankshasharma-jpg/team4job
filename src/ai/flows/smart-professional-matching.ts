
// 'use server'; removed to fix invalid export error

/**
 * @fileOverview This file defines an AI-powered flow for matching clients with suitable professionals based on skills, location, availability, and ratings.
 *
 * - smartProfessionalMatching - A function that initiates the smart professional matching process.
 * - SmartProfessionalMatchingInput - The input type for the smartProfessionalMatching function.
 * - SmartProfessionalMatchingOutput - The return type for the smartProfessionalMatching function.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const SmartProfessionalMatchingInputSchema = z.object({
  jobDescription: z.string().describe('Detailed description of the job requirements.'),
  location: z.string().describe('The location where the job needs to be performed.'),
  skillsRequired: z.array(z.string()).describe('List of skills required for the job.'),
  availability: z.string().describe('The required availability of the professional.'),
});
export type SmartProfessionalMatchingInput = z.infer<typeof SmartProfessionalMatchingInputSchema>;

const SmartProfessionalMatchingOutputSchema = z.object({
  professionalMatches: z.array(
    z.object({
      professionalId: z.string().describe('Unique identifier of the professional.'),
      name: z.string().describe('Name of the professional.'),
      skills: z.array(z.string()).describe('Skills of the professional.'),
      rating: z.number().describe('Average rating of the professional.'),
      distance: z.number().describe('Distance of the professional from the job location in miles.'),
      availability: z.string().describe('Availability of the professional.'),
      matchScore: z.number().describe('A score indicating how well the professional matches the job requirements (0-1).'),
      justification: z.string().describe('Explanation of why this professional is a good match for the job.'),
    })
  ).describe('A list of professionals that are a good match for the job, sorted by matchScore in descending order.'),
});
export type SmartProfessionalMatchingOutput = z.infer<typeof SmartProfessionalMatchingOutputSchema>;

export async function smartProfessionalMatching(input: SmartProfessionalMatchingInput): Promise<SmartProfessionalMatchingOutput> {
  return smartProfessionalMatchingFlow(input);
}

const smartProfessionalMatchingPrompt = ai.definePrompt({
  name: 'smartProfessionalMatchingPrompt',
  input: { schema: SmartProfessionalMatchingInputSchema },
  output: { schema: SmartProfessionalMatchingOutputSchema },
  prompt: `You are an AI assistant designed to match clients with suitable professionals.

  Given the following job details, identify the best professional matches from your database.  Consider skills, location, availability, and ratings to find the most qualified candidates. Provide a match score (0-1) to rank candidates and a justification for each selection.

  Job Description: {{{jobDescription}}}
  Location: {{{location}}}
  Skills Required: {{#each skillsRequired}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Availability: {{{availability}}}

  Format your response as a JSON array of professional objects, sorted by matchScore in descending order.
  `,
});

const smartProfessionalMatchingFlow = defineLoggedFlow(
  {
    name: 'smartProfessionalMatchingFlow',
    inputSchema: SmartProfessionalMatchingInputSchema,
    outputSchema: SmartProfessionalMatchingOutputSchema,
  },
  async (input: z.infer<typeof SmartProfessionalMatchingInputSchema>) => {
    const { output } = await smartProfessionalMatchingPrompt(input);
    return output!;
  }
);
