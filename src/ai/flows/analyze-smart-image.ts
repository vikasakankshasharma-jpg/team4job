
import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeSmartImageInputSchema = z.object({
    imageBase64: z.string().describe('Base64 encoded image of the site or equipment.'),
    category: z.string().optional().describe('Expected category context.'),
});

const AnalyzeSmartImageOutputSchema = z.object({
    title: z.string().describe('Suggested job title based on the image.'),
    description: z.string().describe('Detailed job description based on the image analysis.'),
    jobCategory: z.string().describe('Suggested category.'),
    skills: z.array(z.string()).describe('List of required skills.'),
    equipmentIdentified: z.array(z.string()).describe('List of equipment seen in the image.'),
});

const analyzeSmartImagePrompt = ai.definePrompt({
    name: 'analyzeSmartImagePrompt',
    input: { schema: AnalyzeSmartImageInputSchema },
    output: { schema: AnalyzeSmartImageOutputSchema },
    prompt: `You are an expert technical site surveyor and job planner.
  Analyze the provided image to create a detailed job posting for a technician or installer.
  
  Expected Category Context: {{category}}

  Look for:
  1. **Equipment**: Identify any technical hardware, tools, or infrastructure visible.
  2. **Environment**: Identify the setting (Internal, External, Height, Mounting surface types).
  3. **Work Type**: Infer if it is a new installation, cleanup, repair, or upgrade.

  Based on the image, generate:
  - A professional **Job Title**.
  - A detailed **Description** of the work required, being as specific as possible about the visible environment.
  - The correct **Category** (e.g., "Networking", "Security & Surveillance", "Electrical").
  - A list of necessary **Skills**.
  - A list of **Equipment** identified.

  Image: {{media url=imageBase64}}
  `,
});

export const analyzeSmartImageFlow = defineLoggedFlow(
    {
        name: 'analyzeSmartImageFlow',
        inputSchema: AnalyzeSmartImageInputSchema,
        outputSchema: AnalyzeSmartImageOutputSchema,
    },
    async (input: z.infer<typeof AnalyzeSmartImageInputSchema>) => {
        const { output } = await analyzeSmartImagePrompt({
            imageBase64: input.imageBase64,
            category: input.category || 'Technical Site'
        }, { model: 'googleai/gemini-1.5-flash' });

        if (!output) {
            throw new Error("Failed to analyze image.");
        }
        return output;
    }
);
