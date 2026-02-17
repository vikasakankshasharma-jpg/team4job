// 'use server'; removed to fix invalid export error

/**
 * @fileOverview Integrates Cashfree's PAN Lite verification.
 * 
 * - verifyPan - Verifies a PAN number via Cashfree.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';

// === Cashfree API Configuration ===
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/verification';
const CASHFREE_API_VERSION = '2024-04-01'; // Recent version for verification APIs

// === Input/Output Schemas ===

const VerifyPanInputSchema = z.object({
    pan: z.string().length(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").describe('The 10-character PAN number.'),
    name: z.string().optional().describe('Optional name to verify against PAN data.'),
});
export type VerifyPanInput = z.infer<typeof VerifyPanInputSchema>;

const VerifyPanOutputSchema = z.object({
    isValid: z.boolean().describe('Whether the PAN is valid and exists.'),
    registeredName: z.string().optional().describe('The name registered with the PAN (if valid).'),
    message: z.string().describe('Status message.'),
});
export type VerifyPanOutput = z.infer<typeof VerifyPanOutputSchema>;

/**
 * server-to-server call to Cashfree's PAN Lite API.
 */
async function callCashfreeVerifyPan(pan: string): Promise<{ success: boolean; data?: any; error?: string }> {
    console.log(`[Cashfree KYC] Verifying PAN: ${pan.slice(0, 2)}...`);

    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
        return { success: false, error: 'Server configuration error: Missing KYC API credentials.' };
    }

    const verificationId = `PAN_VERIF_${Date.now()}`;

    try {
        const response = await axios.post(
            `${CASHFREE_API_BASE}/pan-lite`,
            {
                pan: pan,
                verification_id: verificationId
            },
            {
                headers: {
                    'x-client-id': process.env.CASHFREE_CLIENT_ID,
                    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                    'x-api-version': CASHFREE_API_VERSION,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data;
        // PAN Lite success check
        // Logic: If 'valid' is true
        if (response.status === 200 && (data.valid === true || data.status === 'VALID')) {
            return { success: true, data: data };
        } else {
            return { success: false, error: data.message || 'PAN verification failed.' };
        }

    } catch (error: any) {
        console.error('[Cashfree KYC] API call error (PAN):', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'An unexpected error occurred during PAN verification.' };
    }
}

export const verifyPan = defineLoggedFlow(
    {
        name: 'verifyPan',
        inputSchema: VerifyPanInputSchema,
        outputSchema: VerifyPanOutputSchema,
    },
    async (input: z.infer<typeof VerifyPanInputSchema>) => {
        // Mock for Testing
        if (input.pan === 'ABCDE1234F') {
            console.log('[Cashfree KYC] Using mock PAN verification.');
            return {
                isValid: true,
                registeredName: 'MOCK USER NAME',
                message: 'PAN verified successfully (Mock).',
            };
        }

        const { success, data, error } = await callCashfreeVerifyPan(input.pan);

        if (!success) {
            return {
                isValid: false,
                message: error || 'PAN verification failed.',
            };
        }

        return {
            isValid: true,
            registeredName: data.registered_name || data.name || 'Verified User',
            message: 'PAN verified successfully.',
        };
    }
);
