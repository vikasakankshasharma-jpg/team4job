
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProcessCCTVVoiceInputSchema = z.object({
    transcript: z.string().describe('The transcribed text from the user voice input.'),
});

const ProcessCCTVVoiceOutputSchema = z.object({
    title: z.string().describe('Suggested job title (e.g., "3-Camera Shop Installation").'),
    description: z.string().describe('Detailed job description based on the voice input.'),
    jobCategory: z.string().describe('Suggested category (e.g., "Security & CCTV").'),
    skills: z.array(z.string()).describe('List of required skills (e.g., "CCTV", "Night Vision").'),
    equipmentIdentified: z.array(z.string()).describe('List of equipment mentioned (e.g., "Dome Camera", "DVR").'),
});

const processCCTVVoicePrompt = ai.definePrompt({
    name: 'processCCTVVoicePrompt',
    input: { schema: ProcessCCTVVoiceInputSchema },
    output: { schema: ProcessCCTVVoiceOutputSchema },
    prompt: `You are an expert CCTV Installer assistant.
  Analyze the following voice transcript from a customer to create a detailed job posting.

  Transcript: "{{transcript}}"

  Extract:
  1. **Intent**: What does the user want? (Install, Repair, Service)
  2. **Quantity**: How many cameras?
  3. **Specifics**: Night vision, Indoor/Outdoor, DVR size, Recording days.

  Generate:
  - A professional **Job Title**.
  - A detailed **Description**.
  - The correct **Category** (usually "Security & CCTV").
  - A list of **Skills**.
  - A list of **Equipment** mentioned.
  `,
});

export const processCCTVVoiceFlow = ai.defineFlow(
    {
        name: 'processCCTVVoiceFlow',
        inputSchema: ProcessCCTVVoiceInputSchema,
        outputSchema: ProcessCCTVVoiceOutputSchema,
    },
    async (input: z.infer<typeof ProcessCCTVVoiceInputSchema>) => {
        const { output } = await processCCTVVoicePrompt({
            transcript: input.transcript
        }, { model: 'googleai/gemini-1.5-flash' });

        if (!output) {
            throw new Error("Failed to process voice input.");
        }
        return output;
    }
);
