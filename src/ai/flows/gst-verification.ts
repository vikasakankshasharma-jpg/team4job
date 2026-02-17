// 'use server'; removed to fix invalid export error

/**
 * @fileOverview Integrates Cashfree's GST Verification.
 * 
 * - verifyGst - Verifies a GSTIN via Cashfree.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';

// === Cashfree API Configuration ===
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/verification';
const CASHFREE_API_VERSION = '2024-04-01';

const VerifyGstInputSchema = z.object({
    gstin: z.string().length(15).regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format").describe('The 15-character GSTIN.'),
    businessName: z.string().optional().describe('Optional business name to verify against GST data.'),
});
export type VerifyGstInput = z.infer<typeof VerifyGstInputSchema>;

const VerifyGstOutputSchema = z.object({
    isValid: z.boolean().describe('Whether the GSTIN is valid and active.'),
    legalName: z.string().optional().describe('The legal name of the business.'),
    message: z.string().describe('Status message.'),
});
export type VerifyGstOutput = z.infer<typeof VerifyGstOutputSchema>;

async function callCashfreeVerifyGst(gstin: string): Promise<{ success: boolean; data?: any; error?: string }> {
    console.log(`[Cashfree KYC] Verifying GSTIN: ${gstin}...`);

    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
        return { success: false, error: 'Server configuration error: Missing KYC API credentials.' };
    }

    const verificationId = `GST_VERIF_${Date.now()}`;

    try {
        const response = await axios.post(
            `${CASHFREE_API_BASE}/gstin`,
            {
                gstin: gstin,
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
        if (response.status === 200 && (data.valid === true || data.status === 'VALID')) {
            return { success: true, data: data };
        } else {
            return { success: false, error: data.message || 'GSTIN verification failed.' };
        }

    } catch (error: any) {
        console.error('[Cashfree KYC] API call error (GST):', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'An unexpected error occurred during GST verification.' };
    }
}

export const verifyGst = defineLoggedFlow(
    {
        name: 'verifyGst',
        inputSchema: VerifyGstInputSchema,
        outputSchema: VerifyGstOutputSchema,
    },
    async (input: z.infer<typeof VerifyGstInputSchema>) => {
        // Mock for Testing
        if (input.gstin === '22AAAAA0000A1Z5') {
            console.log('[Cashfree KYC] Using mock GST verification.');
            return {
                isValid: true,
                legalName: 'MOCK GSTIN BUSINESS',
                message: 'GSTIN verified successfully (Mock).',
            };
        }

        const { success, data, error } = await callCashfreeVerifyGst(input.gstin);

        if (!success) {
            return {
                isValid: false,
                message: error || 'GSTIN verification failed.',
            };
        }

        return {
            isValid: true,
            legalName: data.legal_name || data.business_name || 'Verified Business',
            message: 'GSTIN verified successfully.',
        };
    }
);
