

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
const UPI_REGEX = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/; // Simple UPI pattern
const KEYWORD_REGEX = /whatsapp|telegram|signal|viber|wechat|paytm|gpay|phonepe/i;

// Wrapper removed to prefer direct flow export
export type ModerateMessageInput = z.infer<typeof ModerateMessageInputSchema>;

export const ModerateMessageOutputSchema = z.object({
    isFlagged: z.boolean().describe('True if the message is unsafe (scam, harassment, off-platform).'),
    reason: z.string().optional().describe('The reason for flagging (e.g., "Scam", "Toxic", "PII").'),
});
export type ModerateMessageOutput = z.infer<typeof ModerateMessageOutputSchema>;



const moderateMessagePrompt = ai.definePrompt({
    name: 'moderateMessagePrompt',
    input: { schema: ModerateMessageInputSchema },
    output: { schema: ModerateMessageOutputSchema },
    prompt: `You are a Safety Moderator for a home services marketplace. 
  Check the following message for safety violations.
  
  Violations include:
  1. **Scams:** Requests for advance payment, sharing fake bank details.
  2. **Off-Platforming:** Asking to chat on WhatsApp/Phone/Telegram/Signal to avoid fees.
  3. **Harassment:** Toxic, abusive, or threatening language.
  4. **PII:** Sharing phone numbers or emails (only if context implies circumvention).
  5. **Direct Payments:** Sharing UPI IDs (e.g. user@upi) or asking for direct bank transfer outside the app.

  Message: "{{{message}}}"

  Return JSON with 'isFlagged' (true/false) and a brief 'reason'.
  If safe, return isFlagged: false.
  `,
});

// Lazy import to avoid circular dependencies or server-init issues if not needed
const getRateLimit = async () => (await import('@/lib/services/rate-limit')).checkRateLimit;

export const moderateMessageFlow = ai.defineFlow(
    {
        name: 'moderateMessageFlow',
        inputSchema: ModerateMessageInputSchema,
        outputSchema: ModerateMessageOutputSchema,
    },
    async (input: z.infer<typeof ModerateMessageInputSchema>) => {
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

        let output: any = null;
        try {
            const result = await moderateMessagePrompt(input, { model: 'googleai/gemini-1.5-flash' });
            output = result.output;
        } catch (error) {
            console.warn("AI Moderation failed (rate limit or key issue), falling back to Regex:", error);
            // output remains null, triggering fallback below
        }

        // If AI says "Safe" (isFlagged: false) OR AI fails (returns null), we run Regex Check.
        if (!output || !output.isFlagged) {
            const hasPhone = PHONE_REGEX.test(input.message);
            const hasEmail = EMAIL_REGEX.test(input.message);
            const hasUpi = UPI_REGEX.test(input.message);
            const hasKeyword = KEYWORD_REGEX.test(input.message);

            if (hasPhone || hasEmail || hasUpi || hasKeyword) {
                return {
                    isFlagged: true,
                    reason: "Safety Violation: Prohibited contact/payment info or keywords detected."
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
