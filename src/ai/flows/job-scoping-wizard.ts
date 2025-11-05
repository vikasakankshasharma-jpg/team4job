
'use server';

/**
 * @fileOverview This file defines an AI-powered flow for helping a novice user scope their job requirements.
 *
 * It takes a simple natural language query from the user and expands it into a structured,
 * detailed job post, including a title, description, suggested skills, and a budget.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateJobDetailsOutputSchema } from './generate-job-details';

const JobScopingWizardInputSchema = z.object({
  userQuery: z.string().describe('A simple, natural language description of the user\'s need.'),
});
export type JobScopingWizardInput = z.infer<typeof JobScopingWizardInputSchema>;

// The output is the same as the GenerateJobDetails flow, as it produces the same structured data.
export type JobScopingWizardOutput = z.infer<typeof GenerateJobDetailsOutputSchema>;

export async function jobScopingWizard(input: JobScopingWizardInput): Promise<JobScopingWizardOutput> {
  return jobScopingWizardFlow(input);
}

const jobScopingPrompt = ai.definePrompt({
  name: 'jobScopingPrompt',
  input: {schema: JobScopingWizardInputSchema},
  output: {schema: GenerateJobDetailsOutputSchema},
  prompt: `You are an expert CCTV and security consultant helping a non-technical user create a detailed job post.
  The user has provided a simple description of their needs. Your task is to transform this simple query into a professional, structured job post.

  User's Request: "{{{userQuery}}}"

  To do this, you must first think about the clarifying questions you would ask the user. For example:
  - What type of property is it (e.g., home, office, store, warehouse)?
  - What is the approximate size (e.g., square footage, number of rooms)?
  - Is it for indoor, outdoor, or both?
  - Are there any specific areas to monitor (e.g., entrances, cash counter, parking lot)?
  - Is there existing lighting?
  - Do you have a preference for video quality (e.g., basic, clear, high-definition)?

  Based on the user's initial query and your own simulated answers to these clarifying questions, generate the following:

  1.  **Job Title:** A clear, professional title that installers will understand (e.g., "Security Camera Setup for a Small Retail Store").
  2.  **Job Description:** A detailed description (150-200 words) that elaborates on the likely scope. Mention the type of property, potential camera count (make a reasonable estimate), and common objectives (e.g., "monitor entry points," "oversee sales area").
  3.  **Suggested Skills:** A list of 5-7 relevant technical skills installers would need.
  4.  **Budget Estimation:** A realistic minimum and maximum budget range in Indian Rupees (INR) for a project of this likely scope.

  Return the full output in the specified JSON format.
  `,
});

const jobScopingWizardFlow = ai.defineFlow(
  {
    name: 'jobScopingWizardFlow',
    inputSchema: JobScopingWizardInputSchema,
    outputSchema: GenerateJobDetailsOutputSchema,
  },
  async input => {
    const {output} = await jobScopingPrompt(input);
    if (!output) {
      throw new Error("Failed to generate job details from AI wizard.");
    }
    return output;
  }
);
