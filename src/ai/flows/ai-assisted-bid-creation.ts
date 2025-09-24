'use server';

/**
 * @fileOverview An AI-powered assistant for installers to craft effective bids.
 *
 * - aiAssistedBidCreation - A function that generates a bid using AI.
 * - AiAssistedBidCreationInput - The input type for the aiAssistedBidCreation function.
 * - AiAssistedBidCreationOutput - The return type for the aiAssistedBidCreation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAssistedBidCreationInputSchema = z.object({
  jobDescription: z.string().describe('The description of the job to bid on.'),
  installerSkills: z.string().describe('The skills of the installer.'),
  installerExperience: z.string().describe('The experience level of the installer.'),
  bidContext: z.string().optional().describe('Any existing bid context or previous attempts.'),
});
export type AiAssistedBidCreationInput = z.infer<typeof AiAssistedBidCreationInputSchema>;

const AiAssistedBidCreationOutputSchema = z.object({
  bidProposal: z.string().describe('The generated bid proposal.'),
  reasoning: z.string().describe('The AI reasoning behind the bid proposal.'),
});
export type AiAssistedBidCreationOutput = z.infer<typeof AiAssistedBidCreationOutputSchema>;

export async function aiAssistedBidCreation(input: AiAssistedBidCreationInput): Promise<AiAssistedBidCreationOutput> {
  return aiAssistedBidCreationFlow(input);
}

const bidCreationPrompt = ai.definePrompt({
  name: 'bidCreationPrompt',
  input: {schema: AiAssistedBidCreationInputSchema},
  output: {schema: AiAssistedBidCreationOutputSchema},
  prompt: `You are an AI assistant helping installers create effective bids for jobs.

  Analyze the job description, the installer's skills and experience, and any existing bid context.
  Generate a compelling bid proposal that highlights the installer's suitability for the job.
  Explain the reasoning behind your proposal.

  Job Description: {{{jobDescription}}}
  Installer Skills: {{{installerSkills}}}
  Installer Experience: {{{installerExperience}}}
  Bid Context: {{{bidContext}}}

  Format your response as follows:

  Bid Proposal: [Generated bid proposal here]
  Reasoning: [Explanation of the bid proposal]`,
});

const aiAssistedBidCreationFlow = ai.defineFlow(
  {
    name: 'aiAssistedBidCreationFlow',
    inputSchema: AiAssistedBidCreationInputSchema,
    outputSchema: AiAssistedBidCreationOutputSchema,
  },
  async input => {
    const {output} = await bidCreationPrompt(input);
    return output!;
  }
);
