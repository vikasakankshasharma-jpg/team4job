
import { z } from 'genkit';

export const GenerateJobDetailsInputSchema = z.object({
    jobTitle: z.string().describe('The title of the job.'),
});
export type GenerateJobDetailsInput = z.infer<typeof GenerateJobDetailsInputSchema>;

export const GenerateJobDetailsOutputSchema = z.object({
    jobDescription: z.string().describe('A detailed and compelling job description generated from the job title (150-250 words).'),
    suggestedSkills: z.array(z.string()).describe('A list of 5-7 relevant technical skills for the job.'),
});
export type GenerateJobDetailsOutput = z.infer<typeof GenerateJobDetailsOutputSchema>;
