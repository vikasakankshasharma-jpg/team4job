'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';
import { db } from '@/lib/firebase/server-init';
import { PlatformSettings } from '@/lib/types';

// === Cashfree API Configuration ===
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/verification';

// === PAN Verification ===

const VerifyPanInputSchema = z.object({
    panNumber: z.string().length(10, "PAN must be 10 characters").regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
    name: z.string().optional().describe("User's name to match against PAN records (optional)."),
});
export type VerifyPanInput = z.infer<typeof VerifyPanInputSchema>;

const VerifyPanOutputSchema = z.object({
    valid: z.boolean(),
    registeredName: z.string().optional(),
    message: z.string(),
    verificationId: z.string().optional(),
});
export type VerifyPanOutput = z.infer<typeof VerifyPanOutputSchema>;

async function callCashfreeToVerifyPan(pan: string, name?: string): Promise<{ valid: boolean, registeredName?: string, message: string }> {
    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
        console.error("[Cashfree KYC] Missing Cashfree API credentials.");
        return { valid: false, message: 'Server configuration error: Missing KYC API credentials.' };
    }

    try {
        const response = await axios.post(
            `${CASHFREE_API_BASE}/pan`,
            { pan: pan.toUpperCase(), name: name },
            {
                headers: {
                    'x-client-id': process.env.CASHFREE_CLIENT_ID,
                    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data;

        // Cashfree PAN response structure (varies slightly by version, assuming standard v1/v2 response)
        // Success: { status: "VALID", valid: true, name: "JOHN DOE", ... }
        // or { message: "Pan number is valid", data: { name: "..." }, valid: true }

        // Adjusting for common sandbox response:
        if (data.valid || data.status === 'VALID') {
            const registeredName = data.name || data.data?.name || "Unknown";
            return { valid: true, registeredName: registeredName, message: 'PAN Verified Successfully' };
        } else {
            return { valid: false, message: data.message || 'PAN verification failed.' };
        }

    } catch (error: any) {
        console.error('[Cashfree KYC] API call error on PAN verification:', error.response?.data || error.message);
        const msg = error.response?.data?.message || 'Details mismatch or invalid PAN.';
        return { valid: false, message: msg };
    }
}

export const verifyPan = ai.defineFlow(
    {
        name: 'verifyPan',
        inputSchema: VerifyPanInputSchema,
        outputSchema: VerifyPanOutputSchema,
    },
    async (input) => {
        // Mock for testing
        if (input.panNumber === 'ABCDE1234F') {
            return {
                valid: true,
                registeredName: input.name || "MOCK USER NAME",
                message: "PAN verified successfully (Mock)",
                verificationId: `MOCK_PAN_${Date.now()}`
            };
        }

        const { valid, registeredName, message } = await callCashfreeToVerifyPan(input.panNumber, input.name);

        if (valid) {
            return {
                valid: true,
                registeredName: registeredName,
                message: message,
                verificationId: `PAN_${Date.now()}`
            };
        } else {
            return {
                valid: false,
                message: message
            };
        }
    }
);
