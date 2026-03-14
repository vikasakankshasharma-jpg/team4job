
import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const SmartSplitInputSchema = z.object({
    text: z.string().describe('The natural language bulk request (e.g., "Install 4 devices in Delhi and 8 in Mumbai")'),
    userId: z.string().optional(),
    contextCategory: z.string().optional().default('Security & Surveillance'),
});

const SplitJobSchema = z.object({
    title: z.string(),
    description: z.string(),
    location: z.string().optional(),
    pincode: z.string().optional(),
    deviceCount: z.string().optional(),
    budget: z.object({
        min: z.number(),
        max: z.number(),
        currency: z.string().default('INR'),
    }).optional(),
});

const SmartSplitOutputSchema = z.object({
    jobs: z.array(SplitJobSchema).describe('List of discrete job configurations detected in the text.'),
    explanation: z.string().optional().describe('Brief explanation of how the split was performed.'),
});

export type SmartSplitInput = z.infer<typeof SmartSplitInputSchema>;
export type SmartSplitOutput = z.infer<typeof SmartSplitOutputSchema>;

const smartSplitPrompt = ai.definePrompt({
    name: 'smartSplitPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: SmartSplitInputSchema },
    output: { schema: SmartSplitOutputSchema },
    prompt: `
  You are an expert dispatcher for a job marketplace in India.
  Your task is to take a single "bulk request" string and split it into multiple discrete job postings.
  
  User Request: "{{text}}"
  Category Context: "{{contextCategory}}"
  
  Instructions:
  1. **Identify Discrete Jobs**: Look for mentions of different locations (cities, offices, branches) or different quantities that imply separate installations.
     - Example: "Delhi and Mumbai" -> 2 Jobs.
     - Example: "3 for home, 5 for shop" -> 2 Jobs.
     
  2. **Extract Details for each Job**:
     - **Title**: Professional title (e.g., "Security Installation - Delhi Office").
     - **Description**: Short, bulleted summary of that specific job's requirement.
     - **Location**: City or area name if detected.
     - **Pincode**: 6-digit Indian pincode if mentioned.
     - **Device Count**: Extract the specific quantity for that site.
     - **Budget**: If a total budget is given, divide it reasonably. If specific budgets are given, use them.
     
  3. **Strict Formatting**: 
     - Output must be a valid JSON array of jobs.
     - Language: Use English for titles and descriptions.
     
  4. **Example Output**:
     Text: "I need 4 devices installed in my Okhla office and 10 devices for my Gurgaon warehouse. Total budget 1 Lakh."
     Jobs: [
       { "title": "Security Installation - Okhla Office", "description": "Indoor installation of 4 devices.", "location": "Okhla, Delhi", "deviceCount": "4", "budget": { "min": 20000, "max": 30000 } },
       { "title": "Security Installation - Gurgaon Warehouse", "description": "Large scale installation of 10 devices.", "location": "Gurgaon, Haryana", "deviceCount": "10", "budget": { "min": 50000, "max": 70000 } }
     ]
  `,
});

export const smartSplitFlow = defineLoggedFlow(
    {
        name: 'smartSplitFlow',
        inputSchema: SmartSplitInputSchema,
        outputSchema: SmartSplitOutputSchema,
        cacheConfig: { enabled: true, ttlSeconds: 3600 },
    },
    async (input) => {
        const { output } = await smartSplitPrompt(input);
        return output!;
    }
);
