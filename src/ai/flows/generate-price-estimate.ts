
import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase/server-init';
import {
  GeneratePriceEstimateInputSchema,
  GeneratePriceEstimateOutputSchema,
  type GeneratePriceEstimateInput,
  type GeneratePriceEstimateOutput
} from './generate-price-estimate-schema';

// Extended schema for the prompt to include history
const PromptInputSchema = GeneratePriceEstimateInputSchema.extend({
  historicalContext: z.string().optional(),
});

import { z } from 'genkit'; // Re-import z for extend if needed, or use imported schema

// The prompt for the AI
const priceEstimatePrompt = ai.definePrompt({
  name: 'priceEstimatePrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: PromptInputSchema },
  output: { schema: GeneratePriceEstimateOutputSchema },
  prompt: `
    You are an expert cost estimator for security and CCTV installation services in India.
    Your task is to analyze the provided job details and generate a realistic and fair market price range in Indian Rupees (INR).

    **Job Details:**
    - **Title:** {{{jobTitle}}}
    - **Category:** {{{jobCategory}}}
    - **Description:** {{{jobDescription}}}

    {{#if historicalContext}}
    **Historical Platform Data (Real Completed Jobs):**
    The following are actual jobs completed on this platform in the same category. Use these as a baseline for current market rates.
    {{{historicalContext}}}
    
    *Note: Adjust your estimate based on the complexity of the current job compared to these historical examples.*
    {{/if}}

    **Your Estimation Process:**
    1.  **Analyze Scope:** Carefully read the title, category, and description to understand the complexity.
    2.  **Factor in Labor Costs:** Estimate the man-hours required.
    3.  **Consider Material Costs (Implicitly):** Factor in a general buffer for consumables.
    4.  **Determine Range:** The min/max price.
    5.  **Explain Reasoning:** Why did you pick this range? What are the main cost drivers?

    **Output Format:** Return JSON with:
    - priceEstimate: { min, max }
    - confidence: "high", "medium", or "low"
    - reasoning: "Based on 3 cameras..."
    - factors: ["3 IP Cameras", "Cabling"]

    **Example:**
    -   **Input:** Title="Install 2 indoor wifi cameras"
    -   **Output:** { "priceEstimate": { "min": 1500, "max": 2500 }, "confidence": "high", "reasoning": "Standard rate for basic wifi camera setup...", "factors": ["2 Cameras", "No cabling"] }

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
    let historicalContext = '';

    // RAG: Fetch historical data from Firestore
    try {
      const db = getAdminDb();
      const jobsRef = db.collection('jobs');
      const snapshot = await jobsRef
        .where('jobCategory', '==', input.jobCategory)
        .where('status', '==', 'Completed')
        .limit(5)
        .get();

      if (!snapshot.empty) {
        const examples = snapshot.docs.map(doc => {
          const data = doc.data();
          // Prioritize subtotal (service cost) if available, otherwise total amount
          const amount = data.invoice?.subtotal || data.invoice?.totalAmount;
          if (!amount) return null;

          const shortDesc = data.description ? data.description.substring(0, 120).replace(/\n/g, ' ') : '';
          return `- Job: "${data.title}" | Scope: "${shortDesc}..." | Agreed Price: ₹${amount}`;
        }).filter(Boolean);

        if (examples.length > 0) {
          historicalContext = examples.join('\n');
        }
      }
    } catch (error) {
      console.warn("Failed to fetch historical context for price estimate:", error);
      // Continue without history if fetch fails
    }

    const { output } = await priceEstimatePrompt({
      ...input,
      historicalContext
    });

    if (!output) {
      throw new Error('AI failed to generate a price estimate.');
    }
    return output;
  }
);
