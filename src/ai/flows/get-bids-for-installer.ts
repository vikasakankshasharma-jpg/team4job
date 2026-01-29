// 'use server'; removed to fix invalid export error

/**
 * @fileOverview THIS FLOW IS DEPRECATED AND NOT IN USE.
 * The logic has been moved to a client-side query in src/app/dashboard/my-bids/page.tsx
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Job, Bid } from '@/lib/types';

const GetBidsForInstallerInputSchema = z.object({
  installerId: z.string().describe('The ID of the installer to get bids for.'),
});
export type GetBidsForInstallerInput = z.infer<typeof GetBidsForInstallerInputSchema>;

const GetBidsForInstallerOutputSchema = z.object({
  jobs: z.array(z.custom<Job>()).describe('A list of jobs the installer has bid on.'),
  bids: z.array(z.custom<Bid>()).describe('A list of the installer\'s bids.'),
});
export type GetBidsForInstallerOutput = z.infer<typeof GetBidsForInstallerOutputSchema>;

async function getBidsForInstaller(input: GetBidsForInstallerInput): Promise<GetBidsForInstallerOutput> {
  // This function is deprecated and should not be used.
  // The logic is now handled client-side.
  console.warn("getBidsForInstallerFlow is deprecated and should not be called.");
  return { jobs: [], bids: [] };
}

export const getBidsForInstallerFlow = ai.defineFlow(
  {
    name: 'getBidsForInstallerFlow',
    inputSchema: GetBidsForInstallerInputSchema,
    outputSchema: GetBidsForInstallerOutputSchema,
  },
  getBidsForInstaller
);
