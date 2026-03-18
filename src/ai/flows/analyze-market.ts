// src/ai/flows/analyze-market.ts

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeMarketInputSchema = z.object({
    jobTitle: z.string().describe('The title of the job.'),
    jobCategory: z.string().describe('The category of the job.'),
    pincode: z.string().describe('The location of the job.'),
    currentBudget: z.number().describe('The current minimum budget for the job.'),
    isUrgent: z.boolean().optional().describe('Whether the job is marked as urgent.'),
    bidCount: z.number().describe('How many bids have already been received.'),
    daysSincePosted: z.number().describe('How many days since the job was posted.'),
});

const AnalyzeMarketOutputSchema = z.object({
    demandLevel: z.enum(['Low', 'Medium', 'High']).describe('Predicted professional demand for this job.'),
    suggestedBoostPercentage: z.number().describe('Percentage (0-100) to increase the budget/travel tip by.'),
    reasoning: z.string().describe('Explanation for the market analysis.'),
    recommendedAction: z.string().describe('A concrete step for the Client (e.g., "Add a travel tip of ₹500").'),
    marketTrend: z.string().describe('Summary of the current market for this category and location.'),
});

/**
 * Genkit Flow to analyze market conditions for a job and suggest price boosts.
 */
export const analyzeMarketFlow = defineLoggedFlow(
    {
        name: 'analyzeMarketFlow',
        inputSchema: AnalyzeMarketInputSchema,
        outputSchema: AnalyzeMarketOutputSchema,
    },
    async (input) => {
        const prompt = `You are an expert market analyst for an on-demand service platform in India.
        Analyze the following job posting and provide strategic pricing advice to the Client.
        
        Job Details:
        - Title: ${input.jobTitle}
        - Category: ${input.jobCategory}
        - Pincode: ${input.pincode}
        - Current Budget: ₹${input.currentBudget}
        - Urgency: ${input.isUrgent ? 'URGENT' : 'Standard'}
        - Performance: ${input.bidCount} bids received in ${input.daysSincePosted} days.
        
        Guidelines:
        1. If bidCount is 0 after 2 days, demand is likely "Low" or the price is too low.
        2. If the job is URGENT, suggest a "Boost" of at least 15% to attract premium professionals.
        3. Consider the pincode: Some areas may have higher travel costs.
        4. Suggest specific actions like adding a "Travel Tip" instead of just increasing the base budget.
        
        Output the analysis in the requested JSON format.
        `;

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: prompt,
            output: { schema: AnalyzeMarketOutputSchema }
        });

        if (!output) {
            throw new Error("Failed to analyze market conditions.");
        }

        return output;
    }
);
