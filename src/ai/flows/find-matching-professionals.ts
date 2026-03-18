
// 'use server'; removed to fix invalid export error

/**
 * @fileOverview This file defines an AI-powered flow for matching unbid jobs with suitable professionals from the platform's user base.
 *
 * - findMatchingProfessionals - A function that initiates the smart professional matching process.
 * - FindMatchingProfessionalsInput - The input type for the findMatchingProfessionals function.
 * - FindMatchingProfessionalsOutput - The return type for the findMatchingProfessionals function.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';
import { User } from '@/lib/types';

import { getAdminDb } from '@/lib/firebase/server-init';

const FindMatchingProfessionalsInputSchema = z.object({
  jobDescription: z.string().describe('Detailed description of the job requirements.'),
  location: z.string().describe('The pincode where the job needs to be performed.'),
  skillsRequired: z.array(z.string()).describe('List of skills required for the job.'),
});
export type FindMatchingProfessionalsInput = z.infer<typeof FindMatchingProfessionalsInputSchema>;

const FindMatchingProfessionalsOutputSchema = z.object({
  professionalMatches: z.array(z.custom<User>()).describe('A list of professionals that are a good match for the job, sorted by relevance.'),
});
export type FindMatchingProfessionalsOutput = z.infer<typeof FindMatchingProfessionalsOutputSchema>;

export async function findMatchingProfessionals(input: FindMatchingProfessionalsInput): Promise<FindMatchingProfessionalsOutput> {
  return findMatchingProfessionalsFlow(input);
}

const findMatchingProfessionalsFlow = defineLoggedFlow(
  {
    name: 'findMatchingProfessionalsFlow',
    inputSchema: FindMatchingProfessionalsInputSchema,
    outputSchema: FindMatchingProfessionalsOutputSchema,
  },
  async ({ jobDescription, location, skillsRequired }: z.infer<typeof FindMatchingProfessionalsInputSchema>) => {
    // In a real-world scenario, you might use a vector database for this.
    // For this implementation, we will fetch professionals with relevant skills and in the same location
    // and then use an LLM to rank them based on the job description.

    const db = getAdminDb();
    const snapshot = await db.collection('users')
      .where('roles', 'array-contains', 'Professional')
      .where('professionalProfile.verified', '==', true)
      .where('status', '==', 'active')
      .get();

    const allProfessionals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    // Basic pre-filtering based on location (pincode) and skills
    const locationFilteredProfessionals = allProfessionals.filter(professional =>
      professional.pincodes.residential === location || professional.pincodes.office === location
    );

    const candidates = locationFilteredProfessionals.filter(professional =>
      skillsRequired.every(skill => professional.professionalProfile?.skills.includes(skill))
    );

    if (candidates.length === 0) {
      return { professionalMatches: [] };
    }

    // Use LLM to rank the candidates
    const prompt = `You are a technical recruitment expert. Given a job description and a list of pre-filtered candidates, rank the top 5 candidates who are the best fit for the job. Consider their skills, tier, and rating. Respond ONLY with a JSON array of the user IDs of the top 5 candidates, in order from best to worst match.

    Job Description: "${jobDescription}"
    
    Candidates:
    ${candidates.map(c => JSON.stringify({
      id: c.id,
      name: c.name,
      skills: c.professionalProfile?.skills,
      tier: c.professionalProfile?.tier,
      rating: c.professionalProfile?.rating,
      points: c.professionalProfile?.points,
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

    const rankedProfessionals = rankedIds
      .map((id: string) => candidates.find((c: User) => c.id === id))
      .filter((c: User | undefined): c is User => c !== undefined);

    return { professionalMatches: rankedProfessionals };
  }
);
