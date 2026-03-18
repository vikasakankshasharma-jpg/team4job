// 'use server'; removed to fix invalid export error

/**
 * @fileOverview THIS FLOW IS DEPRECATED AND NOT IN USE.
 * The logic has been moved to a client-side query in src/app/dashboard/my-bids/page.tsx
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';
import { Job, Bid } from '@/lib/types';

const GetBidsForProfessionalInputSchema = z.object({
  professionalId: z.string().describe('The ID of the Professional to get bids for.'),
});
export type GetBidsForProfessionalInput = z.infer<typeof GetBidsForProfessionalInputSchema>;

const GetBidsForProfessionalOutputSchema = z.object({
  jobs: z.array(z.custom<Job>()).describe('A list of jobs the Professional has bid on.'),
  bids: z.array(z.custom<Bid>()).describe('A list of the Professional\'s bids.'),
});
export type GetBidsForProfessionalOutput = z.infer<typeof GetBidsForProfessionalOutputSchema>;

async function getBidsForProfessional(input: GetBidsForProfessionalInput): Promise<GetBidsForProfessionalOutput> {
  // This function is deprecated and should not be used.
  // The logic is now handled client-side.

  return { jobs: [], bids: [] };
}

export const getBidsForProfessionalFlow = defineLoggedFlow(
  {
    name: 'getBidsForProfessionalFlow',
    inputSchema: GetBidsForProfessionalInputSchema,
    outputSchema: GetBidsForProfessionalOutputSchema,
  },
  async (input) => getBidsForProfessional(input)
);
