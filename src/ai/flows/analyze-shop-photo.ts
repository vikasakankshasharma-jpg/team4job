// src/ai/flows/analyze-shop-photo.ts

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeShopPhotoInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image of the shop or specialized equipment.'),
});

const AnalyzeShopPhotoOutputSchema = z.object({
    recognizedEquipment: z.array(z.string()).describe('List of tools/equipment identified in the photo.'),
    suggestedSkills: z.array(z.string()).describe('Suggested profile skills based on the equipment found.'),
    professionalGrade: z.boolean().describe('Whether the equipment appears to be professional-grade vs consumer-grade.'),
    feedback: z.string().describe('Encouraging feedback for the installer about their gear.'),
});

/**
 * Genkit Flow to analyze shop photos and equipment using Gemini 1.5 Flash.
 */
export const analyzeShopPhotoFlow = defineLoggedFlow(
    {
        name: 'analyzeShopPhotoFlow',
        inputSchema: AnalyzeShopPhotoInputSchema,
        outputSchema: AnalyzeShopPhotoOutputSchema,
    },
    async (input) => {
        const prompt = `You are an expert technical consultant for service professionals (Security, IT, Electrical).
        Analyze the provided shop or equipment photo.
        
        Task:
        1. Identify any specialized tools or inventory. Examples: Fiber Splicing kits, Digital Multimeters, Security System Testers, Cable Fish Tapes, Hammer Drills, Rack Mounts, POE Switches.
        2. Suggest technical skills that this equipment implies the user has.
        3. Assess if the equipment looks professional-grade.
        4. Provide encouraging feedback about their professional setup.
        `;

        const { output } = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: [
                { text: prompt },
                { media: { url: `data:image/jpeg;base64,${input.imageBase64}`, contentType: 'image/jpeg' } }
            ],
            output: { schema: AnalyzeShopPhotoOutputSchema }
        });

        if (!output) {
            throw new Error("Failed to analyze equipment photo.");
        }

        return output;
    }
);
