
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeCCTVImageInputSchema = z.object({
    imageBase64: z.string().describe('Base64 encoded image of the site or equipment.'),
});

const AnalyzeCCTVImageOutputSchema = z.object({
    title: z.string().describe('Suggested job title (e.g., "Install 4 Dome Cameras").'),
    description: z.string().describe('Detailed job description based on the image analysis.'),
    jobCategory: z.string().describe('Suggested category (e.g., "Security & CCTV").'),
    skills: z.array(z.string()).describe('List of required skills (e.g., "CCTV", "Drilling").'),
    equipmentIdentified: z.array(z.string()).describe('List of equipment seen in the image.'),
});

const analyzeCCTVImagePrompt = ai.definePrompt({
    name: 'analyzeCCTVImagePrompt',
    input: { schema: AnalyzeCCTVImageInputSchema },
    output: { schema: AnalyzeCCTVImageOutputSchema },
    prompt: `You are an expert CCTV Installer and Security System Planner.
  Analyze the provided image to create a detailed job posting for an installer.

  Look for:
  1. **Equipment**: Cameras (Dome, Bullet, PTZ), DVR/NVR, Cables, Power Supply.
  2. **Environment**: Indoor vs Outdoor, Wall type (Concrete, False Ceiling), Height.
  3. **Installation Type**: New Install, Repair, or Replacement.

  Based on the image, generate:
  - A professional **Job Title**.
  - A detailed **Description** of the work required.
  - The correct **Category** (usually "Security & CCTV").
  - A list of necessary **Skills**.
  - A list of **Equipment** identified (for the installer's reference).

  Image: {{media url=imageBase64}}
  `,
});

export const analyzeCCTVImageFlow = ai.defineFlow(
    {
        name: 'analyzeCCTVImageFlow',
        inputSchema: AnalyzeCCTVImageInputSchema,
        outputSchema: AnalyzeCCTVImageOutputSchema,
    },
    async (input) => {
        const { output } = await analyzeCCTVImagePrompt({
            imageBase64: input.imageBase64
        }, { model: 'googleai/gemini-1.5-flash' });

        if (!output) {
            throw new Error("Failed to analyze image.");
        }
        return output;
    }
);
