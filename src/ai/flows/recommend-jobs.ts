
// 'use server'; removed to fix invalid export error

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { aiLearningService } from '@/ai/services/ai-learning.service';

// Input: Installer's skills and a list of job summaries
const RecommendJobsInputSchema = z.object({
    installerSkills: z.array(z.string()).describe('Skills of the installer.'),
    installerLocation: z.string().optional().describe('City/Location of installer.'),
    availability: z.string().optional().describe('Installer availability (e.g., "Weekends only", "Full time").'),
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

// Extended prompt schema to include history
const PromptInputSchema = RecommendJobsInputSchema.extend({
    historicalContext: z.string().optional()
});

const recommendJobsPrompt = ai.definePrompt({
    name: 'recommendJobsPrompt',
    input: { schema: PromptInputSchema },
    output: { schema: RecommendJobsOutputSchema },
    prompt: `You are a Career Matchmaker AI.
  Rank the provided jobs for an installer based on skills, location, and availability match.
  
  Installer Profile:
  - Skills: {{#each installerSkills}}{{this}}, {{/each}}
  - Location: {{{installerLocation}}}
  - Availability: {{{availability}}}

  {{#if historicalContext}}
  **Insights from Successful Matches (Similar Profiles):**
  {{{historicalContext}}}
  {{/if}}

  Available Jobs:
  {{#each jobs}}
  - ID: {{id}}
  - Title: {{title}}
  - Location: {{location}}
  - Required Skills: {{#each skills}}{{this}}, {{/each}}
  {{/each}}

  Task:
  1. Rank the top 3 jobs. High score for matching skills, location, and schedule/availability.
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
    async (input: z.infer<typeof RecommendJobsInputSchema>) => {
        if (!input.jobs || input.jobs.length === 0) {
            return { recommendations: [] };
        }

        // Limit to top 15 jobs for processing to save tokens
        const jobsProcess = input.jobs.slice(0, 15);
        let historicalContext = '';

        try {
            // RAG: Find successful matches for key skills
            // We use the first 3 skills as a proxy for the "profile" query
            const skillQuery = input.installerSkills.slice(0, 3).join(' ');
            const learnedExamples = await aiLearningService.getSuccessfulExamples(
                'job_recommendation',
                skillQuery,
                3
            );

            if (learnedExamples.length > 0) {
                historicalContext += "Installers with similar skills have excelled in:\n";
                learnedExamples.forEach(ex => {
                    const outcome = ex.outcome;
                    if (outcome?.success) {
                        // outcome.actualValue could be the Job Title they succeeded in
                        historicalContext += `- Job Type: "${outcome.actualValue || 'Similar Job'}" (Rating: ${outcome.rating}/5)\n`;
                    }
                });
            }
        } catch (e) {
            console.warn("Learning service lookup failed:", e);
        }

        try {
            const { output } = await recommendJobsPrompt({
                ...input,
                jobs: jobsProcess,
                historicalContext
            });

            // Log interaction
            await aiLearningService.logInteraction(
                'job_recommendation',
                { ...input, jobsCount: input.jobs.length }, // Log summary of input to save space? Or full input? Full input is better for learning.
                output,
                undefined,
                'gemini-2.0-flash'
            );

            return output || { recommendations: [] };
        } catch (e) {
            console.error("Neural Match Error:", e);
            return { recommendations: [] };
        }
    }
);
