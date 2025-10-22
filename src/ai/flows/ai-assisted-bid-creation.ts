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
  prompt: `You are an AI assistant helping a skilled installer create a professional and effective bid for a job. The platform keeps bidders anonymous until a job is awarded.

  **Task**: Generate a compelling bid proposal that highlights the installer's strengths and suitability for the job, while maintaining their anonymity.

  **Instructions**:
  1.  Analyze the job description and the installer's profile (skills, experience).
  2.  Write a professional and persuasive proposal that directly addresses the client's needs.
  3.  **Crucially, do not use a real name in the signature.** Sign off with a professional but generic closing, like "Sincerely, A Skilled Installer" or "Respectfully," as the installer's identity must remain anonymous.
  4.  Do not use placeholders like '[Client Name]' or '[Your Company Name]'. Address the recipient generally, for example, "Dear Job Poster," or start directly with the proposal.

  **Job Description**: {{{jobDescription}}}
  **Installer Profile**: {{{installerSkills}}}, with experience of: {{{installerExperience}}}
  **Previous Context (if any)**: {{{bidContext}}}

  Format your response as a valid JSON object with two keys: "bidProposal" and "reasoning".`,
});

const aiAssistedBidCreationFlow = ai.defineFlow(
  {
    name: 'aiAssistedBidCreationFlow',
    inputSchema: AiAssistedBidCreationInputSchema,
    outputSchema: AiAssistedBidCreationOutputSchema,
  },
  async input => {
    const {output} = await bidCreationPrompt(input);
    if (!output) {
      throw new Error("Failed to generate bid proposal from AI.");
    }
    return output;
  }
);
