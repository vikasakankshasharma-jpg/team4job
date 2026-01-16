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
        currency: z.string().default('INR'),
    }),
    confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the estimate based on clarity of requirements and historical data.'),
    reasoning: z.string().describe('Explanation of how the estimate was calculated, citing specific factors.'),
    factors: z.array(z.string()).describe('List of key factors influencing the cost (e.g. "Number of cameras", "Cable length").'),
});
export type GeneratePriceEstimateOutput = z.infer<typeof GeneratePriceEstimateOutputSchema>;
