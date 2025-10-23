import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { User, Transaction } from '@/lib/types';
import axios from 'axios';

// This would be 'https://api.cashfree.com/payouts' for production
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/payouts';

// Function to get the bearer token from Cashfree
async function getCashfreeBearerToken(): Promise<string> {
    const response = await axios.post(
        `${CASHFREE_API_BASE}/payouts/auth`,
        {}, // Empty body
        {
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': process.env.CASHFREE_PAYOUTS_CLIENT_ID,
                'X-Client-Secret': process.env.CASHFREE_PAYOUTS_CLIENT_SECRET,
            },
        }
    );
    return response.data.data.token;
}

export async function POST(req: NextRequest) {
  try {
    const { transactionId, userId } = await req.json();

    if (!transactionId || !userId) {
      return NextResponse.json({ error: 'Missing transactionId or userId' }, { status: 400 });
    }

    // 1. Fetch user and transaction details from Firestore
    const userRef = doc(db, 'users', userId);
    const transactionRef = doc(db, 'transactions', transactionId);

    const [userSnap, transactionSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(transactionRef)
    ]);

    if (!userSnap.exists() || !transactionSnap.exists()) {
      return NextResponse.json({ error: 'User or Transaction not found' }, { status: 404 });
    }

    const user = userSnap.data() as User;
    const transaction = transactionSnap.data() as Transaction;
    
    if (transaction.status !== 'Funded') {
        return NextResponse.json({ error: 'Transaction is not in a payable state.' }, { status: 400 });
    }

    if (!user.payouts?.beneficiaryId) {
        return NextResponse.json({ error: 'Installer has not configured their bank account for payouts.' }, { status: 400 });
    }

    // 2. Authenticate with Cashfree Payouts
    const token = await getCashfreeBearerToken();
    
    // 3. Commission Calculation
    const payoutAmount = transaction.amount * 0.90; // 10% commission for the platform
    
    // 4. Prepare the transfer payload for Cashfree
    const transferId = `PAYOUT_${transactionId}`;
    const transferPayload = {
      beneId: user.payouts.beneficiaryId,
      amount: payoutAmount.toFixed(2),
      transferId: transferId,
    };
    
    // 5. Make the API call to Cashfree to request the transfer
    await axios.post(
      `${CASHFREE_API_BASE}/payouts/transfers`,
      transferPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    // 6. Store the transferId in our transaction for webhook correlation
    await updateDoc(transactionRef, {
        payoutTransferId: transferId,
    });
    
    // 7. Return success to the frontend.
    // The final status update to "Released" will be handled by the webhook.
    return NextResponse.json({ success: true, transferId });

  } catch (error: any) {
    console.error('Error requesting Cashfree transfer:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to request transfer.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}