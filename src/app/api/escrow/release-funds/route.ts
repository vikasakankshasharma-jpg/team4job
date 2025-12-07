

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/firebase/server-init';
import { User, Transaction, PlatformSettings } from '@/lib/types';
import axios from 'axios';

// Switch to sandbox for beta testing (zero cost)
// Production: 'https://payout-api.cashfree.com/payouts'
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

export async function POST(req: NextRequest) {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    const transactionRef = db.collection('transactions').doc(transactionId);
    const transactionSnap = await transactionRef.get();

    if (!transactionSnap.exists) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    const transaction = transactionSnap.data() as Transaction;

    if (transaction.status !== 'Funded') {
      return NextResponse.json({ error: `Transaction is not in a payable state. Current status: ${transaction.status}` }, { status: 400 });
    }

    const installerSnap = await db.collection('users').doc(transaction.payeeId).get();
    if (!installerSnap.exists || !installerSnap.data()?.payouts?.beneficiaryId) {
      return NextResponse.json({ error: 'Installer payout details (beneficiary ID) not configured.' }, { status: 400 });
    }
    const installer = installerSnap.data() as User;
    const beneficiaryId = installer.payouts!.beneficiaryId!;

    const token = await getCashfreeBearerToken();

    // Use the pre-calculated payoutToInstaller amount from the transaction document
    const payoutAmount = transaction.payoutToInstaller;
    const transferId = `PAYOUT_${transaction.id}`;

    // This is the "Easy Split" part. We are making a standard transfer,
    // which Cashfree will later reconcile against the incoming payment.
    const transferPayload = {
      beneId: beneficiaryId,
      amount: payoutAmount.toFixed(2),
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

    // Optimistically update the status. The webhook will be the final confirmation.
    await transactionRef.update({
      payoutTransferId: transferId,
      status: 'Released'
    });

    // In a production system, you would also trigger a transfer for your commission here
    // to your own pre-registered beneficiary account. For this demo, we assume the 
    // commission is reconciled by Cashfree's reports.

    return NextResponse.json({ success: true, transferId });

  } catch (error: any) {
    console.error('Error releasing funds:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to request payout.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
