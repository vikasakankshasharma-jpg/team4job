'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase/server-init';

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

// Extended schema for the prompt to include history
const PromptInputSchema = GeneratePriceEstimateInputSchema.extend({
  historicalContext: z.string().optional(),
});

// The prompt for the AI
const priceEstimatePrompt = ai.definePrompt({
  name: 'priceEstimatePrompt',
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
        -   Consider the number of cameras, type of cameras (IP, Analog), required wiring, NVR/DVR setup, and any other specific tasks mentioned.
    2.  **Factor in Labor Costs:** Estimate the man-hours required.
    3.  **Consider Material Costs (Implicitly):** Factor in a general buffer for consumables.
    4.  **Determine Range:**
        -   The **minimum price** should reflect a baseline cost.
        -   The **maximum price** should account for higher-quality work or unexpected complexities.
    5.  **Output Format:** Return the final \`min\` and \`max\` price estimate in the specified JSON format. The values should be numbers only, without any currency symbols or commas. Ensure the max is greater than the min.

    **Example:**
    -   **Input:** Title="Install 2 indoor wifi cameras", Description="Simple setup for my living room."
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
    let historicalContext = '';
    
    // RAG: Fetch historical data from Firestore
    try {
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

// We need a server-callable wrapper
export async function generatePriceEstimate(input: GeneratePriceEstimateInput): Promise<GeneratePriceEstimateOutput> {
  return generatePriceEstimateFlow(input);
}
