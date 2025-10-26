
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { Job, User, Transaction, PlatformSettings } from '@/lib/types';
import axios from 'axios';

// Use 'https://api.cashfree.com/pg' for production
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

async function getPlatformSettings(): Promise<PlatformSettings> {
    const settingsRef = doc(db, 'settings', 'platform');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        return settingsSnap.data() as PlatformSettings;
    }
    // Return default values if settings are not configured
    return {
        installerCommissionRate: 10,
        jobGiverFeeRate: 2,
        proInstallerPlanPrice: 2999,
        businessJobGiverPlanPrice: 4999,
        bidBundle10: 500,
        bidBundle25: 1100,
        bidBundle50: 2000,
        defaultTrialPeriodDays: 30,
        freeBidsForNewInstallers: 10,
        freePostsForNewJobGivers: 3,
        pointsForJobCompletion: 50,
        pointsFor5StarRating: 20,
        pointsFor4StarRating: 10,
        penaltyFor1StarRating: -25,
        silverTierPoints: 500,
        goldTierPoints: 1000,
        platinumTierPoints: 2000,
        minJobBudget: 500,
        autoVerifyInstallers: true
    };
}


export async function POST(req: NextRequest) {
  try {
    const { jobId, jobTitle, jobGiverId, installerId, amount } = await req.json();

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

    // 2. Create a new Transaction document in Firestore
    const transactionId = `TXN-${jobId}-${Date.now()}`;
    const transactionRef = doc(db, 'transactions', transactionId);

    const platformSettings = await getPlatformSettings();
    const commission = amount * (platformSettings.installerCommissionRate / 100);

    const newTransaction: Transaction = {
        id: transactionId,
        jobId,
        jobTitle,
        payerId: jobGiverId,
        payeeId: installerId,
        amount,
        commission,
        status: 'Initiated',
        createdAt: Timestamp.now(),
    };
    
    // IMPORTANT: Create the transaction record BEFORE creating the payment order
    await setDoc(transactionRef, newTransaction);
    
    // 3. Create an order with Cashfree, using our transactionId as the order_id
    const orderPayload = {
        order_id: transactionId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
            customer_id: jobGiverId,
            customer_email: jobGiver.email,
            customer_phone: jobGiver.mobile,
            customer_name: jobGiver.name,
        },
        order_meta: {
            // This URL is where Cashfree will redirect the user after payment
            return_url: `https://cctv-job-connect.web.app/dashboard/jobs/${jobId}?payment_status=success&order_id={order_id}`,
        },
        order_note: `Payment for job: ${jobTitle}`
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

    // 4. Update our transaction document with the Cashfree order ID and session ID
    // Note: The order_id from cashfree will be the same as our transactionId
    await updateDoc(transactionRef, {
        paymentGatewayOrderId: response.data.order_id,
        paymentGatewaySessionId: paymentSessionId,
    });
    
    // 5. Return the session ID to the frontend to launch checkout
    return NextResponse.json({ payment_session_id: paymentSessionId });

  } catch (error: any) {
    console.error('Error initiating payment:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to initiate payment.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
