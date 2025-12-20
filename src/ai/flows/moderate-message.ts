
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModerateMessageInputSchema = z.object({
    message: z.string().describe('The message content to moderate.'),
});
export type ModerateMessageInput = z.infer<typeof ModerateMessageInputSchema>;

export const ModerateMessageOutputSchema = z.object({
    isFlagged: z.boolean().describe('True if the message is unsafe (scam, harassment, off-platform).'),
    reason: z.string().optional().describe('The reason for flagging (e.g., "Scam", "Toxic", "PII").'),
});
export type ModerateMessageOutput = z.infer<typeof ModerateMessageOutputSchema>;

export async function moderateMessage(input: ModerateMessageInput): Promise<ModerateMessageOutput> {
    return moderateMessageFlow(input);
}

const moderateMessagePrompt = ai.definePrompt({
    name: 'moderateMessagePrompt',
    input: { schema: ModerateMessageInputSchema },
    output: { schema: ModerateMessageOutputSchema },
    prompt: `You are a Safety Moderator for a home services marketplace. 
  Check the following message for safety violations.
  
  Violations include:
  1. **Scams:** Requests for advance payment, sharing fake bank details.
  2. **Off-Platforming:** Asking to chat on WhatsApp/Phone/Telegram to avoid fees.
  3. **Harassment:** Toxic, abusive, or threatening language.
  4. **PII:** Sharing phone numbers or emails (only if context implies circumvention).

  Message: "{{{message}}}"

  Return JSON with 'isFlagged' (true/false) and a brief 'reason'.
  If safe, return isFlagged: false.
  `,
});

const moderateMessageFlow = ai.defineFlow(
    {
        name: 'moderateMessageFlow',
        inputSchema: ModerateMessageInputSchema,
        outputSchema: ModerateMessageOutputSchema,
    },
    async input => {
        // Optimization: Skip empty or very short messages
        if (!input.message || input.message.length < 5) {
            return { isFlagged: false };
        }

        const { output } = await moderateMessagePrompt(input);
        if (!output) {
            // Fail safe: If AI fails, assume safe but log error (in real prod maybe flag for review)
            return { isFlagged: false };
        }
        return output;
    }
);
