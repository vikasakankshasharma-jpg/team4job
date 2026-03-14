
import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';

const ProcessSmartVoiceInputSchema = z.object({
    transcript: z.string().describe('The transcribed text from the user voice input.'),
    category: z.string().optional().describe('The job category to help context (e.g., "Networking", "Electrical").'),
});

const ProcessSmartVoiceOutputSchema = z.object({
    title: z.string().describe('Suggested job title based on the transcript.'),
    description: z.string().describe('Detailed job description based on the voice input.'),
    jobCategory: z.string().describe('The actual or suggested category.'),
    skills: z.array(z.string()).describe('List of required skills.'),
    equipmentIdentified: z.array(z.string()).describe('List of equipment mentioned.'),
});

const processSmartVoicePrompt = ai.definePrompt({
    name: 'processSmartVoicePrompt',
    input: { schema: ProcessSmartVoiceInputSchema },
    output: { schema: ProcessSmartVoiceOutputSchema },
    prompt: `You are an expert technical job assistant. 
  Analyze the following voice transcript from a customer to create a detailed professional job posting.
  
  Expected Category Context: {{category}}

  Transcript: "{{transcript}}"

  Extract:
  1. **Intent**: What does the user want? (Install, Repair, Service, Consult)
  2. **Scope**: Quantity of equipment or size of premises mentioned.
  3. **Specifics**: Any technical details, brands, or environmental constraints.

  Generate:
  - A professional **Job Title**.
  - A detailed **Description** formatting it for an installer/technician.
  - The most appropriate **Category** (if not provided, suggest the best fit).
  - A list of **Skills** (e.g., "Wiring", "Configuration", specific tech).
  - A list of **Equipment** mentioned.
  `,
});

export const processSmartVoiceFlow = defineLoggedFlow(
    {
        name: 'processSmartVoiceFlow',
        inputSchema: ProcessSmartVoiceInputSchema,
        outputSchema: ProcessSmartVoiceOutputSchema,
    },
    async (input: z.infer<typeof ProcessSmartVoiceInputSchema>) => {
        const { output } = await processSmartVoicePrompt({
            transcript: input.transcript,
            category: input.category || 'Technical Service'
        }, { model: 'googleai/gemini-1.5-flash' });

        if (!output) {
            throw new Error("Failed to process voice input.");
        }
        return output;
    }
);
