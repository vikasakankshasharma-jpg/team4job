
import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/server-init';
import { User, Transaction, PlatformSettings } from '@/lib/types';
import axios from 'axios';

// Use 'https://payout-api.cashfree.com' for production
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
  throw new Error('Failed to authenticate with Cashfree Payouts.');
}

/**
 * This route is intended for admin-initiated transfers like refunds.
 * Payouts to installers are handled by /api/escrow/release-funds
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    const adminAuth = getAdminAuth();
    // 1. Verify Authentication & Admin Role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    // Verify token using adminAuth
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      console.error('Token verification failed:', e);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Check for Admin Role
    if (decodedToken.admin === true || decodedToken.role === 'Admin') {
      // Authorized
    } else {
      const userRef = db.collection('users').doc(decodedToken.uid);
      const userDoc = await userRef.get();
      const userData = userDoc.data() as User;
      if (!userData || !userData.roles.includes('Admin')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Auth Check Complete

    const { transactionId, transferType, userId } = await req.json();

    if (!transactionId || !transferType || !userId) {
      return NextResponse.json({ error: 'Missing required parameters (transactionId, transferType, userId)' }, { status: 400 });
    }

    if (transferType !== 'refund' && transferType !== 'release_payout') {
      return NextResponse.json({ error: 'Only refund or release_payout transfers are supported.' }, { status: 400 });
    }

    const transactionRef = db.collection('transactions').doc(transactionId);
    const transactionSnap = await transactionRef.get();

    if (!transactionSnap.exists) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    const transaction = transactionSnap.data() as Transaction;

    // Validation: Ensure the user matches the expected recipient
    const expectedRecipientId = transferType === 'refund' ? transaction.payerId : transaction.payeeId;

    if (userId !== expectedRecipientId) {
      return NextResponse.json({ error: 'User ID does not match the expected recipient.' }, { status: 403 });
    }

    if (transaction.status !== 'Funded' && transaction.status !== 'Disputed') {
      return NextResponse.json({ error: `Cannot process transfer for transaction status: ${transaction.status}` }, { status: 400 });
    }

    const userSnap = await db.collection('users').doc(userId).get();

    // For Refunds:
    // Cashfree can refund to source (no beneficiary needed usually), but we previously used standard transfer.
    // For Release Payout (Installer):
    // We DEFINITELY need a beneficiaryId.

    const recipientUser = userSnap.data() as User;
    if (!recipientUser?.payouts?.beneficiaryId) {
      return NextResponse.json({ error: 'Recipient does not have a beneficiary account set up.' }, { status: 400 });
    }

    const token = await getCashfreeBearerToken();

    const amount = transaction.amount; // Simple full amount for now. 
    // Ideally for 'release_payout', we should deduct commission.
    // BUT this is an Admin Override / Dispute Resolution action. 
    // Usually admin releases FULL amount to installer if they won the dispute? Or minus commission?
    // Let's assume standard logic: Deduct commission if it's a Payout. Full amount if it's a Refund (to giver).

    let transferAmount = amount;
    if (transferType === 'release_payout') {
      // Fetch commission rate from platform settings
      let commissionRate = 0.10; // Default fallback
      try {
        const settingsRef = db.collection('platform_settings').doc('fees');
        const settingsSnap = await settingsRef.get();
        if (settingsSnap.exists) {
          const settings = settingsSnap.data() as PlatformSettings;
          commissionRate = settings.installerCommissionRate || 0.10;
        }
      } catch (settingsError) {
        console.error('Failed to fetch commission rate, using default 10%:', settingsError);
      }

      const commission = transaction.commission || (amount * commissionRate);
      transferAmount = amount - commission;
    }

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
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    await transactionRef.update({
      refundTransferId: transferId,
      status: 'Refunded', // Optimistically update, will be confirmed by webhook
      refundedAt: Timestamp.now() as any,
    });

    return NextResponse.json({ success: true, transferId });

  } catch (error: any) {
    console.error('Error processing transfer request:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to request transfer.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
