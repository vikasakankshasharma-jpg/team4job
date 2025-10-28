
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { User, Transaction, PlatformSettings } from '@/lib/types';
import axios from 'axios';

// Use 'https://payout-api.cashfree.com' for production
const CASHFREE_API_BASE = 'https://payout-api.cashfree.com/payouts';

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
export async function POST(req: NextRequest) {
  try {
    // Note: In a real app, you would add authentication here to ensure only an admin can call this.
    const { transactionId, transferType, userId } = await req.json();

    if (!transactionId || !transferType || !userId) {
      return NextResponse.json({ error: 'Missing required parameters (transactionId, transferType, userId)' }, { status: 400 });
    }
    
    if (transferType !== 'refund') {
        return NextResponse.json({ error: 'Only refund transfers are supported at this time.' }, { status: 400 });
    }

    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (!transactionSnap.exists()) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    const transaction = transactionSnap.data() as Transaction;
    
    // For a refund, the user receiving money should be the original payer (Job Giver).
    if (userId !== transaction.payerId) {
        return NextResponse.json({ error: 'User ID does not match the original payer for this transaction.'}, { status: 403 });
    }
    
    if (transaction.status !== 'Funded' && transaction.status !== 'Disputed') {
        return NextResponse.json({ error: `Cannot refund a transaction with status: ${transaction.status}` }, { status: 400 });
    }
    
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists() || !userSnap.data()?.payouts?.beneficiaryId) {
        // NOTE: For refunds, Cashfree doesn't require the Job Giver to be a 'beneficiary'.
        // It can refund to the original payment source. However, if we wanted to refund to a *different*
        // bank account, they would need to be added as a beneficiary.
        // For this implementation, we assume refund to source is sufficient.
    }
    
    const token = await getCashfreeBearerToken();

    const refundAmount = transaction.amount; // Full refund
    const transferId = `REFUND_${transaction.id}`;

    // This is a standard transfer for the refund. Cashfree's dashboard will show this.
    // In a real scenario, you'd likely use a specific "refund" API if available
    // or ensure the Job Giver is a beneficiary to receive funds.
    // For this marketplace model, a standard transfer to the Job Giver's registered beneficiary account works.
    
    const jobGiverAsBeneficiary = userSnap.data() as User;
     if (!jobGiverAsBeneficiary.payouts?.beneficiaryId) {
        return NextResponse.json({ error: 'Job Giver does not have a beneficiary account set up for refunds.' }, { status: 400 });
    }

    const transferPayload = {
      beneId: jobGiverAsBeneficiary.payouts.beneficiaryId,
      amount: refundAmount.toFixed(2),
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

    await updateDoc(transactionRef, {
        refundTransferId: transferId,
        status: 'Refunded', // Optimistically update, will be confirmed by webhook
        refundedAt: new Date(),
    });
    
    return NextResponse.json({ success: true, transferId });

  } catch (error: any) {
    console.error('Error processing transfer request:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to request transfer.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
