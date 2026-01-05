
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModerateMessageInputSchema = z.object({
    message: z.string().describe('The message content to moderate.'),
    userId: z.string().optional().describe('The ID of the user sending the message (for rate limiting).'),
    limitType: z.enum(['ai_chat', 'ai_bio']).optional().default('ai_chat'),
});

// Fallback Regex Patterns
const PHONE_REGEX = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}|\d{10}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
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

// Lazy import to avoid circular dependencies or server-init issues if not needed
const getRateLimit = async () => (await import('@/lib/services/rate-limit')).checkRateLimit;

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

        // Rate Limiting (Server-Side Enforcement)
        if (input.userId) {
            const checkRateLimit = await getRateLimit();
            const limitCheck = await checkRateLimit(input.userId, input.limitType as any || 'ai_chat');
            if (!limitCheck.allowed) {
                return {
                    isFlagged: true,
                    reason: limitCheck.reason || "Daily AI limit reached. Please try again tomorrow."
                };
            }
        }

        const { output } = await moderateMessagePrompt(input);

        // Phase 13: Hybrid Fallback
        // If AI says "Safe" (isFlagged: false) OR AI fails (returns null), we run Regex Check.
        if (!output || !output.isFlagged) {
            const hasPhone = PHONE_REGEX.test(input.message);
            const hasEmail = EMAIL_REGEX.test(input.message);

            if (hasPhone || hasEmail) {
                return {
                    isFlagged: true,
                    reason: "Potential PII sharing detected (Phone/Email Protection - FailSafe)."
                };
            }
        }

        if (!output) {
            // Fail safe: If AI fails and Regex passed, assume safe but log warning.
            return { isFlagged: false };
        }
        return output;
    }
);
