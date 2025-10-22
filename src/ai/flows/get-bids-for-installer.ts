'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getFirestore} from 'firebase-admin/firestore';
import {Job, Bid, User} from '@/lib/types';

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
  const db = getFirestore();
  const jobsRef = db.collection('jobs');
  const snapshot = await jobsRef.where('bidderIds', 'array-contains', input.installerId).get();

  if (snapshot.empty) {
    return {jobs: [], bids: []};
  }

  const jobs: Job[] = [];
  const bids: Bid[] = [];
  
  for (const doc of snapshot.docs) {
    const jobData = doc.data() as Job;
    jobData.id = doc.id;
    jobs.push(jobData);

    if (jobData.bids) {
        for (const bid of jobData.bids) {
            // Here we assume bid.installer is a DocumentReference
            if (bid.installer && bid.installer.id === input.installerId) {
                bids.push({...bid, jobId: doc.id});
            }
        }
    }
  }

  return {jobs, bids};
}

export const getBidsForInstallerFlow = ai.defineFlow(
  {
    name: 'getBidsForInstallerFlow',
    inputSchema: GetBidsForInstallerInputSchema,
    outputSchema: GetBidsForInstallerOutputSchema,
  },
  getBidsForInstaller
);
