
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { Job, User, Transaction, PlatformSettings } from '@/lib/types';
import axios from 'axios';

// Use 'https://api.cashfree.com/pg' for production
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

async function getPlatformSettings(): Promise<Partial<PlatformSettings>> {
    const settingsRef = doc(db, 'settings', 'platform');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        return settingsSnap.data() as PlatformSettings;
    }
    // Return an empty object if no settings are configured
    return {};
}


export async function POST(req: NextRequest) {
  try {
    const { jobId, jobTitle, jobGiverId, installerId, amount, travelTip } = await req.json();

    if (!jobId || !jobGiverId || !installerId || !amount) {
      return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 });
    }
    
    // 1. Fetch Job Giver and Installer details
    const [jobGiverSnap, installerSnap] = await Promise.all([
        getDoc(doc(db, 'users', jobGiverId)),
        getDoc(doc(db, 'users', installerId)),
    ]);

    if (!jobGiverSnap.exists() || !installerSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const jobGiver = jobGiverSnap.data() as User;
    const installer = installerSnap.data() as User;

    // 2. Calculate fees and final amounts based on platform settings
    const platformSettings = await getPlatformSettings();
    const installerCommissionRate = platformSettings.installerCommissionRate ?? 0;
    const jobGiverFeeRate = platformSettings.jobGiverFeeRate ?? 0;
    
    const installerCommission = amount * (installerCommissionRate / 100);
    const jobGiverFee = amount * (jobGiverFeeRate / 100);
    const tipAmount = travelTip || 0;
    const totalPaidByGiver = amount + jobGiverFee + tipAmount;
    const payoutToInstaller = amount - installerCommission + tipAmount;

    // 3. Create a new Transaction document in Firestore
    const transactionId = `TXN-${jobId}-${Date.now()}`;
    const transactionRef = doc(db, 'transactions', transactionId);

    const newTransaction: Transaction = {
        id: transactionId,
        jobId,
        jobTitle,
        payerId: jobGiverId,
        payeeId: installerId,
        amount, // Original bid amount
        travelTip: tipAmount,
        commission: installerCommission,
        jobGiverFee: jobGiverFee,
        totalPaidByGiver: totalPaidByGiver,
        payoutToInstaller: payoutToInstaller,
        status: 'Initiated',
        createdAt: Timestamp.now(),
    };
    
    await setDoc(transactionRef, newTransaction);
    
    // 4. Create an order with Cashfree for the total amount to be paid by the Job Giver
    const orderPayload = {
        order_id: transactionId,
        order_amount: totalPaidByGiver,
        order_currency: 'INR',
        customer_details: {
            customer_id: jobGiverId,
            customer_email: jobGiver.email,
            customer_phone: jobGiver.mobile,
            customer_name: jobGiver.name,
        },
        order_meta: {
            return_url: `https://cctv-job-connect.web.app/dashboard/jobs/${jobId}?payment_status=success&order_id={order_id}`,
        },
        order_note: `Payment for job: ${jobTitle} (Includes platform fee & tip)`
    };

    const response = await axios.post(
      `${CASHFREE_API_BASE}/orders`,
      orderPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.CASHFREE_PAYMENTS_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_PAYMENTS_CLIENT_SECRET,
          'x-api-version': '2022-09-01',
        },
      }
    );
    
    const paymentSessionId = response.data.payment_session_id;

    // 5. Update our transaction document with the Cashfree order ID and session ID
    await updateDoc(transactionRef, {
        paymentGatewayOrderId: response.data.order_id,
        paymentGatewaySessionId: paymentSessionId,
    });
    
    // 6. Return the session ID to the frontend to launch checkout
    return NextResponse.json({ payment_session_id: paymentSessionId });

  } catch (error: any) {
    console.error('Error initiating payment:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to initiate payment.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
