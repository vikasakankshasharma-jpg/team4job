// src/ai/flows/analyze-id-card.ts

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeIDCardInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image of the identity card (PAN or Aadhar).'),
});

const AnalyzeIDCardOutputSchema = z.object({
    cardType: z.enum(['Aadhar', 'PAN', 'Unknown']).describe('The type of card detected.'),
    idNumber: z.string().optional().describe('The extracted identity number (12 digits for Aadhar, 10 for PAN).'),
    name: z.string().optional().describe('The extracted name from the card.'),
    dob: z.string().optional().describe('The extracted date of birth if available.'),
    message: z.string().describe('Status or feedback message.'),
});

/**
 * Genkit Flow to analyze identity documents (Aadhar/PAN) using Gemini 1.5 Flash.
 */
export const analyzeIDCardFlow = defineLoggedFlow(
    {
        name: 'analyzeIDCardFlow',
        inputSchema: AnalyzeIDCardInputSchema,
        outputSchema: AnalyzeIDCardOutputSchema,
    },
    async (input) => {
        const prompt = `You are a specialized OCR assistant for Indian KYC documents.
        Analyze the provided image of an identity card.
        
        Extract the following fields if they are clearly visible:
        - Card Type: Identify if it is an Aadhar Card or a PAN Card.
        - ID Number: 12-digit number for Aadhar or 10-character alphanumeric for PAN.
        - Name: Full name of the cardholder.
        - Date of Birth (DOB): In DD/MM/YYYY or similar format.
        
        If the image is blurry or not a valid identity card, set Card Type to 'Unknown' and provide a helpful message.
        `;

        const { output } = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: [
                { text: prompt },
                { media: { url: `data:image/jpeg;base64,${input.imageBase64}`, contentType: 'image/jpeg' } }
            ],
            output: { schema: AnalyzeIDCardOutputSchema }
        });

        if (!output) {
            throw new Error("Failed to analyze identity card.");
        }

        return output;
    }
);
