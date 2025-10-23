
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { User, Transaction } from '@/lib/types';
import axios from 'axios';

// This would be 'https://api.cashfree.com' for production
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

export async function POST(req: NextRequest) {
  try {
    const { transactionId, userId } = await req.json();

    if (!transactionId || !userId) {
      return NextResponse.json({ error: 'Missing transactionId or userId' }, { status: 400 });
    }

    // 1. Fetch transaction and user details from Firestore
    const transactionRef = doc(db, 'transactions', transactionId);
    const userRef = doc(db, 'users', userId);

    const [transactionSnap, userSnap] = await Promise.all([
      getDoc(transactionRef),
      getDoc(userRef)
    ]);

    if (!transactionSnap.exists() || !userSnap.exists()) {
      return NextResponse.json({ error: 'Transaction or User not found' }, { status: 404 });
    }

    const transaction = transactionSnap.data() as Transaction;
    const user = userSnap.data() as User;

    // 2. Prepare the order payload for Cashfree
    const orderPayload = {
      customer_details: {
        customer_id: user.id,
        customer_email: user.email,
        customer_phone: user.mobile,
        customer_name: user.name,
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/jobs/${transaction.jobId}?payment_status=success&order_id={order_id}`,
      },
      order_id: transaction.id,
      order_amount: transaction.amount,
      order_currency: 'INR',
      order_note: `Payment for job: ${transaction.jobTitle}`,
    };
    
    // 3. Make the API call to Cashfree to create the order
    const response = await axios.post(
      `${CASHFREE_API_BASE}/orders`,
      orderPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': process.env.CASHFREE_PAYMENTS_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_PAYMENTS_CLIENT_SECRET,
        },
      }
    );
    
    const paymentSession = response.data;
    
    if (!paymentSession.payment_session_id) {
        throw new Error("Failed to create payment session from Cashfree.");
    }
    
    // 4. Store the gateway order ID and session ID in our transaction record
    await updateDoc(transactionRef, {
        paymentGatewayOrderId: paymentSession.order_id,
        paymentGatewaySessionId: paymentSession.payment_session_id,
    });
    
    // 5. Return the session ID to the frontend
    return NextResponse.json({ payment_session_id: paymentSession.payment_session_id });

  } catch (error: any) {
    console.error('Error creating Cashfree payment:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to create payment session.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
