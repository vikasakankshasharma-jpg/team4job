
'use server';

/**
 * @fileOverview An AI-powered flow to analyze job bids anonymously and provide recommendations.
 *
 * - analyzeBids - A function that takes job and anonymized bid data and returns an analysis.
 * - AnalyzeBidsInput - The input schema for the flow.
 * - AnalyzeBidsOutput - The output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const BidderProfileSchema = z.object({
  anonymousId: z.string().describe("The anonymous ID of the bidder (e.g., 'Bidder-1')."),
  bidAmount: z.number().describe('The amount the installer has bid for the job in INR.'),
  tier: z.string().describe("The installer's reputation tier (e.g., Bronze, Silver, Gold, Platinum)."),
  rating: z.number().describe('The installer\'s average star rating (0-5).'),
  reviewCount: z.number().describe('The total number of reviews the installer has received.'),
  isFavorite: z.boolean().optional().describe('Whether the job giver has marked this installer as a favorite in the past.'),
  isBlocked: z.boolean().optional().describe('Whether the job giver has blocked this installer.'),
});

export const AnalyzeBidsInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('The description of the job.'),
  bidders: z.array(BidderProfileSchema).describe('An array of anonymized bidder profiles.'),
});
export type AnalyzeBidsInput = z.infer<typeof AnalyzeBidsInputSchema>;

export const AnalyzeBidsOutputSchema = z.object({
  summary: z.string().describe('A one-sentence summary of the bid situation (e.g., "You have 5 bids ranging from X to Y.").'),
  topRecommendation: z.object({
    anonymousId: z.string(),
    reasoning: z.string().describe('A detailed justification for why this bidder is the top recommendation, considering their tier, rating, bid price, and relationship (Favorite).'),
  }).describe('The single best recommendation for the Job Giver.'),
  bestValue: z.object({
    anonymousId: z.string(),
    reasoning: z.string().describe('A justification for why this bidder represents the best value for money, balancing cost and qualifications.'),
  }).describe('The bid that offers the best balance of price and quality.'),
  redFlags: z.array(z.object({
    anonymousId: z.string(),
    concern: z.string().describe('A specific concern about this bid (e.g., "Bid is significantly lower than average", "Installer is blocked").'),
  })).describe('A list of any bids that warrant extra caution.'),
});
export type AnalyzeBidsOutput = z.infer<typeof AnalyzeBidsOutputSchema>;


export const analyzeBidsFlow = ai.defineFlow(
  {
    name: 'analyzeBidsFlow',
    inputSchema: AnalyzeBidsInputSchema,
    outputSchema: AnalyzeBidsOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert hiring consultant for CCTV installation projects. Your task is to analyze a set of anonymous bids for a job and provide a clear, actionable recommendation to the Job Giver.

    **Job Details:**
    - Title: "${input.jobTitle}"
    - Description: "${input.jobDescription}"

    **Bidders (Anonymous):**
    ${input.bidders.map(b => `- ${b.anonymousId}: Bid ₹${b.bidAmount}, Tier: ${b.tier}, Rating: ${b.rating}/5 from ${b.reviewCount} reviews.${b.isFavorite ? ' **(MARKED AS FAVORITE)**' : ''}${b.isBlocked ? ' **(BLOCKED USER)**' : ''}`).join('\n')}

    **Your Analysis Must Include:**
    1.  **Summary:** A single sentence summarizing the number of bids and the price range.
    2.  **Top Recommendation:** Identify the single best bidder. 
        - **CRITICAL:** If a bidder is marked as **FAVORITE**, they should be your Top Recommendation unless their price is unreasonably high (e.g., >50% higher than average) or their recent rating is very poor. Trust is the most important factor. Explicitly mention they are a trusted/favorite installer in the reasoning.
        - If no favorite, prioritize experience and reliability (Platinum/Gold, high reviews) over lowest price.
    3.  **Best Value:** Identify the bidder who offers the best balance of cost and quality. This might be a Silver or Gold tier installer with a good rating and a competitive price.
    4.  **Red Flags:** Identify any potential red flags. 
        - **CRITICAL:** Any bidder marked as **BLOCKED** must be listed here with a severe warning ("You have previously blocked this user").
        - Flag bids significantly lower than others (potential misunderstanding of scope).
        - Flag bidders with very low ratings.

    Return your complete analysis in the specified JSON format.`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'gemini-1.5-flash',
      output: {
        schema: AnalyzeBidsOutputSchema,
      },
    });

    const analysis = llmResponse.output;

    if (!analysis) {
      throw new Error("Failed to get a valid analysis from the AI model.");
    }

    return analysis;
  }
);
