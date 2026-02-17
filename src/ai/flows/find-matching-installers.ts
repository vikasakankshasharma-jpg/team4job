
// 'use server'; removed to fix invalid export error

/**
 * @fileOverview This file defines an AI-powered flow for matching unbid jobs with suitable installers from the platform's user base.
 *
 * - findMatchingInstallers - A function that initiates the smart installer matching process.
 * - FindMatchingInstallersInput - The input type for the findMatchingInstallers function.
 * - FindMatchingInstallersOutput - The return type for the findMatchingInstallers function.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';
import { User } from '@/lib/types';

import { getAdminDb } from '@/lib/firebase/server-init';

const FindMatchingInstallersInputSchema = z.object({
  jobDescription: z.string().describe('Detailed description of the job requirements.'),
  location: z.string().describe('The pincode where the job needs to be performed.'),
  skillsRequired: z.array(z.string()).describe('List of skills required for the job.'),
});
export type FindMatchingInstallersInput = z.infer<typeof FindMatchingInstallersInputSchema>;

const FindMatchingInstallersOutputSchema = z.object({
  installerMatches: z.array(z.custom<User>()).describe('A list of installers that are a good match for the job, sorted by relevance.'),
});
export type FindMatchingInstallersOutput = z.infer<typeof FindMatchingInstallersOutputSchema>;

export async function findMatchingInstallers(input: FindMatchingInstallersInput): Promise<FindMatchingInstallersOutput> {
  return findMatchingInstallersFlow(input);
}

const findMatchingInstallersFlow = defineLoggedFlow(
  {
    name: 'findMatchingInstallersFlow',
    inputSchema: FindMatchingInstallersInputSchema,
    outputSchema: FindMatchingInstallersOutputSchema,
  },
  async ({ jobDescription, location, skillsRequired }: z.infer<typeof FindMatchingInstallersInputSchema>) => {
    // In a real-world scenario, you might use a vector database for this.
    // For this implementation, we will fetch installers with relevant skills and in the same location
    // and then use an LLM to rank them based on the job description.

    const db = getAdminDb();
    const snapshot = await db.collection('users')
      .where('roles', 'array-contains', 'Installer')
      .where('installerProfile.verified', '==', true)
      .where('status', '==', 'active')
      .get();

    const allInstallers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    // Basic pre-filtering based on location (pincode) and skills
    const locationFilteredInstallers = allInstallers.filter(installer =>
      installer.pincodes.residential === location || installer.pincodes.office === location
    );

    const candidates = locationFilteredInstallers.filter(installer =>
      skillsRequired.every(skill => installer.installerProfile?.skills.includes(skill))
    );

    if (candidates.length === 0) {
      return { installerMatches: [] };
    }

    // Use LLM to rank the candidates
    const prompt = `You are a hiring manager for CCTV installers. Given a job description and a list of pre-filtered candidates, rank the top 5 candidates who are the best fit for the job. Consider their skills, tier, and rating. Respond ONLY with a JSON array of the user IDs of the top 5 candidates, in order from best to worst match.

    Job Description: "${jobDescription}"
    
    Candidates:
    ${candidates.map(c => JSON.stringify({
      id: c.id,
      name: c.name,
      skills: c.installerProfile?.skills,
      tier: c.installerProfile?.tier,
      rating: c.installerProfile?.rating,
      points: c.installerProfile?.points,
    })).join('\n')}
    
    Your response must be a valid JSON array of strings, like ["user-id-1", "user-id-2"].
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'gemini-1.5-flash',
      output: {
        format: 'json',
        schema: z.array(z.string()),
      },
    });

    const rankedIds = llmResponse.output || [];

    const rankedInstallers = rankedIds
      .map((id: string) => candidates.find((c: User) => c.id === id))
      .filter((c: User | undefined): c is User => c !== undefined);

    return { installerMatches: rankedInstallers };
  }
);
