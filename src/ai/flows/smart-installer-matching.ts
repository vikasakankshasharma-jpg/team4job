
// 'use server'; removed to fix invalid export error

/**
 * @fileOverview This file defines an AI-powered flow for matching Job Givers with suitable installers based on skills, location, availability, and ratings.
 *
 * - smartInstallerMatching - A function that initiates the smart installer matching process.
 * - SmartInstallerMatchingInput - The input type for the smartInstallerMatching function.
 * - SmartInstallerMatchingOutput - The return type for the smartInstallerMatching function.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const SmartInstallerMatchingInputSchema = z.object({
  jobDescription: z.string().describe('Detailed description of the job requirements.'),
  location: z.string().describe('The location where the job needs to be performed.'),
  skillsRequired: z.array(z.string()).describe('List of skills required for the job.'),
  availability: z.string().describe('The required availability of the installer.'),
});
export type SmartInstallerMatchingInput = z.infer<typeof SmartInstallerMatchingInputSchema>;

const SmartInstallerMatchingOutputSchema = z.object({
  installerMatches: z.array(
    z.object({
      installerId: z.string().describe('Unique identifier of the installer.'),
      name: z.string().describe('Name of the installer.'),
      skills: z.array(z.string()).describe('Skills of the installer.'),
      rating: z.number().describe('Average rating of the installer.'),
      distance: z.number().describe('Distance of the installer from the job location in miles.'),
      availability: z.string().describe('Availability of the installer.'),
      matchScore: z.number().describe('A score indicating how well the installer matches the job requirements (0-1).'),
      justification: z.string().describe('Explanation of why this installer is a good match for the job.'),
    })
  ).describe('A list of installers that are a good match for the job, sorted by matchScore in descending order.'),
});
export type SmartInstallerMatchingOutput = z.infer<typeof SmartInstallerMatchingOutputSchema>;

export async function smartInstallerMatching(input: SmartInstallerMatchingInput): Promise<SmartInstallerMatchingOutput> {
  return smartInstallerMatchingFlow(input);
}

const smartInstallerMatchingPrompt = ai.definePrompt({
  name: 'smartInstallerMatchingPrompt',
  input: { schema: SmartInstallerMatchingInputSchema },
  output: { schema: SmartInstallerMatchingOutputSchema },
  prompt: `You are an AI assistant designed to match job givers with suitable installers.

  Given the following job details, identify the best installer matches from your database.  Consider skills, location, availability, and ratings to find the most qualified candidates. Provide a match score (0-1) to rank candidates and a justification for each selection.

  Job Description: {{{jobDescription}}}
  Location: {{{location}}}
  Skills Required: {{#each skillsRequired}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Availability: {{{availability}}}

  Format your response as a JSON array of installer objects, sorted by matchScore in descending order.
  `,
});

const smartInstallerMatchingFlow = defineLoggedFlow(
  {
    name: 'smartInstallerMatchingFlow',
    inputSchema: SmartInstallerMatchingInputSchema,
    outputSchema: SmartInstallerMatchingOutputSchema,
  },
  async (input: z.infer<typeof SmartInstallerMatchingInputSchema>) => {
    const { output } = await smartInstallerMatchingPrompt(input);
    return output!;
  }
);
