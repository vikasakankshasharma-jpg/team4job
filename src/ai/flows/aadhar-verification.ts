

// 'use server'; removed to fix invalid export error


/**
 * @fileOverview Integrates Cashfree's Secure ID for Aadhar verification.
 * This file uses Cashfree's v2 APIs for a two-step OTP process.
 *
 * - initiateAadharVerification - Requests an OTP for a given Aadhar number via Cashfree.
 * - confirmAadharVerification - Verifies the OTP with Cashfree to complete the KYC process.
 */

import { ai, defineLoggedFlow } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';

import { getAdminDb } from '@/lib/firebase/server-init';
import { PlatformSettings } from '@/lib/types';


// === Cashfree API Configuration ===
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/verification';
const CASHFREE_API_VERSION = '2022-09-01'; // As per v2 Aadhaar verification docs

// === Step 1: Initiate Verification and Request OTP ===

const InitiateAadharInputSchema = z.object({
  aadharNumber: z.string().length(12).describe('The 12-digit Aadhar number.'),
});
export type InitiateAadharInput = z.infer<typeof InitiateAadharInputSchema>;

const InitiateAadharOutputSchema = z.object({
  success: z.boolean().describe('Whether the OTP request was successfully initiated.'),
  verificationId: z.string().describe('A unique transaction ID for this verification attempt.'),
  message: z.string().describe('A message indicating the status of the request.'),
});
export type InitiateAadharOutput = z.infer<typeof InitiateAadharOutputSchema>;

/**
 * Makes a server-to-server call to Cashfree's Secure ID API to request an OTP.
 * @param aadharNumber The 12-digit Aadhar number.
 * @returns A verification ID and status.
 */
async function callCashfreeToRequestOtp(aadharNumber: string): Promise<{ success: boolean, verificationId?: string, error?: string }> {
  console.log(`[Cashfree KYC] Requesting OTP for Aadhar: ${aadharNumber.slice(0, 4)}...`);

  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    console.error("[Cashfree KYC] Missing Cashfree API credentials.");
    return { success: false, error: 'Server configuration error: Missing KYC API credentials.' };
  }

  const verificationId = `CCTV_KYC_${Date.now()}`;

  try {
    const response = await axios.post(
      `${CASHFREE_API_BASE}/v2/aadhaar-verification/otp`,
      {
        verification_id: verificationId,
        aadhaar_number: aadharNumber
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
    if (response.status === 200 && data.ref_id) {
      console.log(`[Cashfree KYC] OTP sent successfully. Verification ID: ${verificationId}, Ref ID: ${data.ref_id}`);
      return { success: true, verificationId: verificationId };
    } else {
      console.error('[Cashfree KYC] Failed to request OTP:', data);
      return { success: false, error: data.message || 'Failed to initiate OTP request.' };
    }
  } catch (error: any) {
    console.error('[Cashfree KYC] API call error on OTP request:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'An unexpected error occurred.' };
  }
}

export const initiateAadharVerification = defineLoggedFlow(
  {
    name: 'initiateAadharVerification',
    inputSchema: InitiateAadharInputSchema,
    outputSchema: InitiateAadharOutputSchema,
  },
  async (input: z.infer<typeof InitiateAadharInputSchema>) => {
    // For demo purposes, if the Aadhar number is the test number, simulate success without a real API call.
    if (input.aadharNumber === '999999990019') {
      const mockVerificationId = `VERIF_MOCK_${Date.now()}`;
      console.log(`[Cashfree KYC] Using mock OTP flow for test Aadhar. Verification ID: ${mockVerificationId}`);
      return {
        success: true,
        verificationId: mockVerificationId,
        message: 'An OTP has been sent to the mobile number linked with your Aadhar.',
      };
    }

    const { success, verificationId, error } = await callCashfreeToRequestOtp(input.aadharNumber);

    if (!success || !verificationId) {
      return {
        success: false,
        verificationId: '',
        message: error || 'Failed to initiate OTP request.',
      };
    }

    return {
      success: true,
      verificationId: verificationId,
      message: 'An OTP has been sent to the mobile number linked with your Aadhar.',
    };
  }
);


// === Step 2: Confirm Verification with OTP ===

const ConfirmAadharInputSchema = z.object({
  verificationId: z.string().describe('The unique verification ID from the initiation step.'),
  otp: z.string().length(6).describe('The 6-digit OTP sent to the user\'s mobile.'),
});
export type ConfirmAadharInput = z.infer<typeof ConfirmAadharInputSchema>;

const ConfirmAadharOutputSchema = z.object({
  isVerified: z.boolean().describe('Whether the Aadhar verification was successful.'),
  message: z.string().describe('A message indicating the result of the verification.'),
  kycData: z.object({
    name: z.string().describe('The name of the user as per Aadhar.'),
    mobile: z.string().describe('The mobile number as per Aadhar.'),
    pincode: z.string().describe('The pincode as per Aadhar address.'),
  }).optional().describe('KYC data returned on successful verification.'),
});
export type ConfirmAadharOutput = z.infer<typeof ConfirmAadharOutputSchema>;

/**
 * Makes a server-to-server call to Cashfree's Secure ID API to verify the OTP.
 * @param verificationId The unique verification ID.
 * @param otp The 6-digit OTP.
 * @returns A verification status and KYC data.
 */
async function callCashfreeToVerifyOtp(verificationId: string, otp: string): Promise<{ success: boolean; kycData?: z.infer<typeof ConfirmAadharOutputSchema>['kycData']; error?: string }> {
  console.log(`[Cashfree KYC] Verifying OTP for Verification ID: ${verificationId}`);

  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    console.error("[Cashfree KYC] Missing Cashfree API credentials.");
    return { success: false, error: 'Server configuration error: Missing KYC API credentials.' };
  }

  try {
    const response = await axios.post(
      `${CASHFREE_API_BASE}/v2/aadhaar-verification/verify`,
      { otp, verification_id: verificationId },
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
    if (response.status === 200 && data.status === 'VALID' && data.verified === true) {
      console.log('[Cashfree KYC] Verification successful. Returning KYC data.');
      return {
        success: true,
        kycData: {
          name: data.name,
          mobile: data.mobile,
          pincode: data.pincode
        }
      };
    } else {
      console.error('[Cashfree KYC] OTP Verification failed:', data);
      return { success: false, error: data.message || 'OTP verification failed.' };
    }
  } catch (error: any) {
    console.error('[Cashfree KYC] API call error on OTP verification:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'An unexpected error occurred.' };
  }
}

async function getPlatformSettings(): Promise<Partial<PlatformSettings>> {
  const db = getAdminDb();
  const settingsRef = db.collection('settings').doc('platform');
  const settingsSnap = await settingsRef.get();
  if (settingsSnap.exists) {
    return settingsSnap.data() as PlatformSettings;
  }
  // Return default values if settings are not configured
  return {
    autoVerifyInstallers: true, // Default to auto-verifying
  };
}


export const confirmAadharVerification = defineLoggedFlow(
  {
    name: 'confirmAadharVerification',
    inputSchema: ConfirmAadharInputSchema,
    outputSchema: ConfirmAadharOutputSchema,
  },
  async (input: z.infer<typeof ConfirmAadharInputSchema>) => {
    // For demo purposes, if the transaction is a mock one and OTP is correct, simulate success.
    if (input.verificationId.startsWith('VERIF_MOCK_') && input.otp === '123456') {
      console.log('[Cashfree KYC] Using mock verification for test OTP.');
      const mockKycData = {
        name: 'Ramesh Kumar',
        mobile: '9876543210',
        pincode: '110001'
      };
      const settings = await getPlatformSettings();
      const autoVerify = settings.autoVerifyInstallers ?? true;
      return {
        isVerified: autoVerify,
        message: autoVerify ? 'Aadhar verification successful. Your profile is now marked as verified.' : 'Aadhar verification successful. Your profile is pending admin approval.',
        kycData: mockKycData,
      };
    }

    const { success, error, kycData } = await callCashfreeToVerifyOtp(input.verificationId, input.otp);

    if (!success) {
      return {
        isVerified: false,
        message: error || 'Aadhar verification failed.',
      };
    }

    const settings = await getPlatformSettings();
    const autoVerify = settings.autoVerifyInstallers ?? true;

    return {
      isVerified: autoVerify,
      message: autoVerify
        ? 'Aadhar verification successful. Your profile is now marked as verified.'
        : 'Aadhar verification successful. Your profile is pending admin approval.',
      kycData: kycData,
    };
  }
);

