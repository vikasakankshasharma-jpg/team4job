// app/api/cashfree/payouts/request-transfer/route.ts - REFACTORED

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';
import { User, Transaction, PlatformSettings } from '@/lib/types';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const CASHFREE_API_BASE = 'https://payout-gamma.cashfree.com/payouts';

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
 * Admin route for transfers (refunds/payouts)
 * ✅ REFACTORED: Uses infrastructure logger and Firebase
 * 
 * Note: Normal installer payouts use /api/escrow/release-funds
 * This is for admin-initiated transfers like refunds
 */
export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    const adminAuth = getAdminAuth();

    // 1. Verify authentication & admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing token' },
        { status: 401 }
      );
    }
    const idToken = authHeader.split('Bearer ')[1];

    // Verify token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      logger.error('Token verification failed', e);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Check for admin role
    if (decodedToken.admin === true || decodedToken.role === 'Admin') {
      // Authorized
    } else {
      const userRef = db.collection('users').doc(decodedToken.uid);
      const userDoc = await userRef.get();
      const userData = userDoc.data() as User;
      if (!userData || !userData.roles.includes('Admin')) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    // 2. Parse request
    const { transactionId, transferType, userId } = await req.json();

    if (!transactionId || !transferType || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters (transactionId, transferType, userId)' },
        { status: 400 }
      );
    }

    if (transferType !== 'refund' && transferType !== 'release_payout') {
      return NextResponse.json(
        { error: 'Only refund or release_payout transfers are supported' },
        { status: 400 }
      );
    }

    // 3. Get transaction
    const transactionRef = db.collection('transactions').doc(transactionId);
    const transactionSnap = await transactionRef.get();

    if (!transactionSnap.exists) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    const transaction = transactionSnap.data() as Transaction;

    // 4. Validate recipient
    const expectedRecipientId =
      transferType === 'refund' ? transaction.payerId : transaction.payeeId;

    if (userId !== expectedRecipientId) {
      return NextResponse.json(
        { error: 'User ID does not match the expected recipient' },
        { status: 403 }
      );
    }

    if (transaction.status !== 'funded' && transaction.status !== 'disputed') {
      return NextResponse.json(
        { error: `Cannot process transfer for transaction status: ${transaction.status}` },
        { status: 400 }
      );
    }

    // 5. Get recipient details
    const userSnap = await db.collection('users').doc(userId).get();
    const recipientUser = userSnap.data() as User;

    if (!recipientUser?.payouts?.beneficiaryId) {
      return NextResponse.json(
        { error: 'Recipient does not have a beneficiary account set up' },
        { status: 400 }
      );
    }

    // 6. Calculate transfer amount
    let transferAmount = transaction.amount;
    if (transferType === 'release_payout') {
      // Deduct commission for payouts
      let commissionRate = 0.1; // Default fallback
      try {
        const settingsRef = db.collection('platform_settings').doc('fees');
        const settingsSnap = await settingsRef.get();
        if (settingsSnap.exists) {
          const settings = settingsSnap.data() as PlatformSettings;
          commissionRate = settings.installerCommissionRate || 0.1;
        }
      } catch (settingsError) {
        logger.warn('Failed to fetch commission rate, using default 10%', { error: settingsError });
      }

      const commission = transaction.commission || transaction.amount * commissionRate;
      transferAmount = transaction.amount - commission;
    }

    // 7. Request transfer from Cashfree
    const token = await getCashfreeBearerToken();
    const transferId = `${transferType === 'refund' ? 'REFUND' : 'PAYOUT'}_${transaction.id}_${Date.now()}`;

    const transferPayload = {
      beneId: recipientUser.payouts.beneficiaryId,
      amount: transferAmount.toFixed(2),
      transferId: transferId,
    };

    await axios.post(
      `${CASHFREE_API_BASE}/payouts/standard`,
      transferPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // 8. Update transaction status
    await transactionRef.update({
      refundTransferId: transferId,
      status: 'refunded',
      refundedAt: Timestamp.now() as any,
    });

    logger.adminAction(decodedToken.uid, 'TRANSFER_REQUESTED', transactionId, {
      transferId,
      transferType,
      amount: transferAmount,
    });

    return NextResponse.json({ success: true, transferId });
  } catch (error: any) {
    logger.error('Transfer request failed', error, {
      metadata: error.response?.data,
    });
    const errorMessage =
      error.response?.data?.message || 'Failed to request transfer';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
