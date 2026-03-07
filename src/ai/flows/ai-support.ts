
import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'genkit';
import { SYSTEM_PROMPT } from '@/lib/support/faq';

const AiSupportInputSchema = z.object({
    message: z.string().describe('The user message or question.'),
    history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string()
    })).optional().describe('Chat history for context.'),
    userId: z.string().describe('The ID of the user requesting support.'),
});

const AiSupportOutputSchema = z.object({
    response: z.string().describe('The AI generated response.'),
});

export const aiSupportFlow = defineLoggedFlow(
    {
        name: 'aiSupportFlow',
        inputSchema: AiSupportInputSchema,
        outputSchema: AiSupportOutputSchema,
    },
    async (input) => {
        const { message, history = [] } = input;

        const response = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            system: SYSTEM_PROMPT,
            messages: [
                ...(history as any[]).map((h: any) => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, content: [{ text: h.content }] })),
                { role: 'user', content: [{ text: message }] }
            ]
        });

        return {
            response: response.text(),
        };
    }
);
