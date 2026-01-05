
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzePhotoInputSchema = z.object({
    imageUrl: z.string().describe('The URL of the photo to analyze.'),
    jobCategory: z.string().optional().describe('Context for what the photo should show (e.g. CCTV, Plumbing).'),
});
export type AnalyzePhotoInput = z.infer<typeof AnalyzePhotoInputSchema>;

export const AnalyzePhotoOutputSchema = z.object({
    score: z.number().describe('Quality score from 1-5 (5 is best).'),
    feedback: z.string().describe('Brief feedback on the quality.'),
    isProfessional: z.boolean().describe('True if the work looks professional.'),
});
export type AnalyzePhotoOutput = z.infer<typeof AnalyzePhotoOutputSchema>;

export async function analyzePhoto(input: AnalyzePhotoInput): Promise<AnalyzePhotoOutput> {
    return analyzePhotoFlow(input);
}

const analyzePhotoPrompt = ai.definePrompt({
    name: 'analyzePhotoPrompt',
    input: { schema: AnalyzePhotoInputSchema },
    output: { schema: AnalyzePhotoOutputSchema },
    prompt: `You are a strict Quality Control AI for home services.
  Analyze the provided image for execution quality.
  
  Context: This is a completion photo for a "{{{jobCategory}}}" job.

  Evaluate:
  1. **Clarity:** Is the image clear and well-lit?
  2. **Workmanship:** Does the installation/repair look neat? (e.g. no hanging wires, clean finish).
  3. **Professionalism:** Does it look like a pro did it?

  Image: {{{imageUrl}}}

  Return a JSON with:
  - score: 1-5
  - isProfessional: boolean
  - feedback: A short 1-sentence critique.
  `,
});

const analyzePhotoFlow = ai.defineFlow(
    {
        name: 'analyzePhotoFlow',
        inputSchema: AnalyzePhotoInputSchema,
        outputSchema: AnalyzePhotoOutputSchema,
    },
    async input => {
        // Basic validation
        if (!input.imageUrl) {
            throw new Error("No image URL provided");
        }

        try {
            // Note: In a real implementation we would fetch the image bytes or pass the URL if the model supports it.
            // Genkit's multimodal support handles URL inputs for Gemini Vision.
            const { output } = await analyzePhotoPrompt(input);

            if (!output) {
                return { score: 3, isProfessional: true, feedback: "Unable to verify detailed quality." };
            }
            return output;

        } catch (e) {
            console.error("AI Vision Error:", e);
            // Fail gracefully
            return { score: 0, isProfessional: false, feedback: "AI analysis failed." };
        }
    }
);
