
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input: Installer's skills and a list of job summaries
const RecommendJobsInputSchema = z.object({
    installerSkills: z.array(z.string()).describe('Skills of the installer.'),
    installerLocation: z.string().optional().describe('City/Location of installer.'),
    jobs: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        location: z.string(),
        skills: z.array(z.string()).optional()
    })).describe('List of available jobs to rank.')
});
export type RecommendJobsInput = z.infer<typeof RecommendJobsInputSchema>;

// Output: Ordered list of Job IDs with reasoning
export const RecommendJobsOutputSchema = z.object({
    recommendations: z.array(z.object({
        jobId: z.string(),
        score: z.number().describe('Match score 0-100'),
        reason: z.string().describe('Why this job is a good match.')
    }))
});
export type RecommendJobsOutput = z.infer<typeof RecommendJobsOutputSchema>;

export async function recommendJobs(input: RecommendJobsInput): Promise<RecommendJobsOutput> {
    return recommendJobsFlow(input);
}

const recommendJobsPrompt = ai.definePrompt({
    name: 'recommendJobsPrompt',
    input: { schema: RecommendJobsInputSchema },
    output: { schema: RecommendJobsOutputSchema },
    prompt: `You are a Career Matchmaker AI.
  Rank the provided jobs for an installer based on skills and location match.
  
  Installer Profile:
  - Skills: {{#each installerSkills}}{{this}}, {{/each}}
  - Location: {{{installerLocation}}}

  Available Jobs:
  {{#each jobs}}
  - ID: {{id}}
  - Title: {{title}}
  - Location: {{location}}
  - Required Skills: {{#each skills}}{{this}}, {{/each}}
  {{/each}}

  Task:
  1. Rank the top 3 jobs. High score for matching skills and location.
  2. Provide a 1-sentence reason for each.
  3. Return JSON with 'jobId', 'score', and 'reason'.
  `,
});

const recommendJobsFlow = ai.defineFlow(
    {
        name: 'recommendJobsFlow',
        inputSchema: RecommendJobsInputSchema,
        outputSchema: RecommendJobsOutputSchema,
    },
    async input => {
        if (!input.jobs || input.jobs.length === 0) {
            return { recommendations: [] };
        }

        // Limit to top 15 jobs for processing to save tokens
        const jobsProcess = input.jobs.slice(0, 15);

        try {
            const { output } = await recommendJobsPrompt({ ...input, jobs: jobsProcess });
            return output || { recommendations: [] };
        } catch (e) {
            console.error("Neural Match Error:", e);
            return { recommendations: [] };
        }
    }
);
