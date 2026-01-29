// app/api/cashfree/payouts/add-beneficiary/route.ts - REFACTORED

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';
import { User } from '@/lib/types';
import axios from 'axios';

export const dynamic = 'force-dynamic';

// Cashfree Payouts API (sandbox for beta)
const CASHFREE_API_BASE = 'https://payout-gamma.cashfree.com/payouts';

/**
 * Get Cashfree bearer token for payouts API
 */
async function getCashfreeBearerToken(): Promise<string> {
  const response = await axios.post(
    `${CASHFREE_API_BASE}/auth`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': process.env.CASHFREE_PAYOUTS_CLIENT_ID,
        'X-Client-Secret': process.env.CASHFREE_PAYOUTS_CLIENT_SECRET,
      },
    }
  );
  if (response.data?.data?.token) {
    return response.data.data.token;
  }
  throw new Error('Failed to authenticate with Cashfree Payouts');
}

/**
 * Add beneficiary account to Cashfree for payouts
 * ✅ REFACTORED: Uses infrastructure logger and Firebase
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, accountHolderName, accountNumber, ifsc } = await req.json();

    if (!userId || !accountHolderName || !accountNumber || !ifsc) {
      return NextResponse.json(
        { error: 'Missing required beneficiary details' },
        { status: 400 }
      );
    }

    // Fetch user details
    const db = getAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = userSnap.data() as User;

    // Generate unique beneficiary ID
    const beneficiaryId = `INSTALLER_${userId.slice(0, 8)}_${Date.now()}`;

    // Authenticate with Cashfree
    const token = await getCashfreeBearerToken();

    // Prepare beneficiary payload
    const beneficiaryPayload = {
      beneId: beneficiaryId,
      name: accountHolderName,
      email: user.email,
      phone: user.mobile,
      bankAccount: accountNumber,
      ifsc: ifsc,
      address1: user.address.street || 'Not Provided',
    };

    // Make API call to Cashfree
    await axios.post(
      `${CASHFREE_API_BASE}/beneficiaries`,
      beneficiaryPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Store beneficiary info in database
    const lastFourDigits = accountNumber.slice(-4);
    const maskedAccountNumber = `**** **** ${lastFourDigits}`;

    await userRef.update({
      'payouts.beneficiaryId': beneficiaryId,
      'payouts.accountHolderName': accountHolderName,
      'payouts.accountNumberMasked': maskedAccountNumber,
      'payouts.ifsc': ifsc,
    });

    logger.info('Beneficiary added to Cashfree', {
      userId,
      beneficiaryId,
    });

    return NextResponse.json({ success: true, beneficiaryId });
  } catch (error: any) {
    logger.error('Failed to add Cash free beneficiary', error, {
      metadata: error.response?.data,
    });
    const errorMessage =
      error.response?.data?.message || 'Failed to add beneficiary';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
