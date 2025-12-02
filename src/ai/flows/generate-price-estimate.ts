'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema for the price estimation flow
export const GeneratePriceEstimateInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('The detailed description of the job requirements.'),
  jobCategory: z.string().describe('The category of the job (e.g., "IP Camera Installation", "CCTV Maintenance").'),
});
export type GeneratePriceEstimateInput = z.infer<typeof GeneratePriceEstimateInputSchema>;

// Define the output schema for the price estimation flow
export const GeneratePriceEstimateOutputSchema = z.object({
  priceEstimate: z.object({
    min: z.number().describe('The estimated minimum price for the job in INR.'),
    max: z.number().describe('The estimated maximum price for the job in INR.'),
  }),
});
export type GeneratePriceEstimateOutput = z.infer<typeof GeneratePriceEstimateOutputSchema>;

// The prompt for the AI
const priceEstimatePrompt = ai.definePrompt({
  name: 'priceEstimatePrompt',
  input: { schema: GeneratePriceEstimateInputSchema },
  output: { schema: GeneratePriceEstimateOutputSchema },
  prompt: `
    You are an expert cost estimator for security and CCTV installation services in India.
    Your task is to analyze the provided job details and generate a realistic and fair market price range in Indian Rupees (INR).

    **Job Details:**
    - **Title:** {{{jobTitle}}}
    - **Category:** {{{jobCategory}}}
    - **Description:** {{{jobDescription}}}

    **Your Estimation Process:**
    1.  **Analyze Scope:** Carefully read the title, category, and description to understand the complexity.
        -   Consider the number of cameras, type of cameras (IP, Analog), required wiring, NVR/DVR setup, and any other specific tasks mentioned.
        -   For example, a job for "4 IP cameras in a small office" is less complex than "16 cameras for a multi-floor warehouse with outdoor cabling."
    2.  **Factor in Labor Costs:** Estimate the man-hours required. A standard installation might take one technician a day, while a complex one might need two technicians for several days.
    3.  **Consider Material Costs (Implicitly):** While you don't know the exact hardware costs, factor in a general buffer for consumables (cables, connectors, conduits). The final bid from the installer will cover the main hardware.
    4.  **Determine Range:**
        -   The **minimum price** should reflect a baseline cost for a professional to take on this job, covering basic labor and time. It should be a competitive but fair starting point.
        -   The **maximum price** should account for higher-quality work, more experienced technicians, unexpected minor complexities, and a reasonable profit margin.
    5.  **Output Format:** Return the final \`min\` and \`max\` price estimate in the specified JSON format. The values should be numbers only, without any currency symbols or commas. Ensure the max is greater than the min.

    **Example:**
    -   **Input:** Title="Install 2 indoor wifi cameras", Description="Simple setup for my living room."
    -   **Your Thought Process:** Very simple job. Maybe 2-3 hours of work for one person. Low complexity.
    -   **Output:** { "priceEstimate": { "min": 1500, "max": 2500 } }

    Now, analyze the provided job and generate the price estimate.
  `,
});

// Define the Genkit flow
export const generatePriceEstimateFlow = ai.defineFlow(
  {
    name: 'generatePriceEstimateFlow',
    inputSchema: GeneratePriceEstimateInputSchema,
    outputSchema: GeneratePriceEstimateOutputSchema,
  },
  async (input) => {
    const { output } = await priceEstimatePrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a price estimate.');
    }
    return output;
  }
);

// We need a server-callable wrapper
export async function generatePriceEstimate(input: GeneratePriceEstimateInput): Promise<GeneratePriceEstimateOutput> {
  return generatePriceEstimateFlow(input);
}
