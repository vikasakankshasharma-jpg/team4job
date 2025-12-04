
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/server-init';
import { Job, User, Transaction, PlatformSettings, SubscriptionPlan } from '@/lib/types';
import axios from 'axios';

// Use 'https://api.cashfree.com/pg' for production
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

async function getPlatformSettings(): Promise<Partial<PlatformSettings>> {
    const settingsRef = doc(db, 'settings', 'platform');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        return settingsSnap.data() as PlatformSettings;
    }
    // Return default values if no settings are configured
    return {
        installerCommissionRate: 5,
        jobGiverFeeRate: 2,
    };
}


export async function POST(req: NextRequest) {
  try {
    const { jobId, jobGiverId, planId } = await req.json();

    if (!jobId || !jobGiverId) {
      return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 });
    }
    
    // Check if it is a subscription payment
    const isSubscription = jobId.startsWith('SUB-');
    let amount = 0;
    let jobTitle = '';
    let installerId = 'PLATFORM';
    let job: Job | null = null;
    let jobGiver: User | null = null;

    if (isSubscription) {
        if (!planId) {
             return NextResponse.json({ error: 'Plan ID is required for subscription payments.' }, { status: 400 });
        }
        
        const [planSnap, userSnap] = await Promise.all([
            getDoc(doc(db, 'subscriptionPlans', planId)),
            getDoc(doc(db, 'users', jobGiverId))
        ]);
        
        if (!planSnap.exists()) return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
        if (!userSnap.exists()) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const plan = planSnap.data() as SubscriptionPlan;
        jobGiver = userSnap.data() as User;
        
        amount = plan.price;
        jobTitle = `Subscription: ${plan.name}`;
        
    } else {
        // Handle Standard Job Payment
        const jobRef = doc(db, 'jobs', jobId);
        const [jobSnap, jobGiverSnap] = await Promise.all([
            getDoc(jobRef),
            getDoc(doc(db, 'users', jobGiverId)),
        ]);

        if (!jobSnap.exists()) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        if (!jobGiverSnap.exists()) return NextResponse.json({ error: 'Job Giver not found' }, { status: 404 });

        job = jobSnap.data() as Job;
        jobGiver = jobGiverSnap.data() as User;
        jobTitle = job.title;
        
        if (!job.awardedInstaller) return NextResponse.json({ error: 'Job has no awarded installer' }, { status: 400 });
        
        installerId = job.awardedInstaller.id;
        const installerSnap = await getDoc(doc(db, 'users', installerId));
        if (!installerSnap.exists()) return NextResponse.json({ error: 'Installer not found' }, { status: 404 });

        // Determine the amount from the winning bid for regular jobs
        if (job.bids && job.bids.length > 0) {
            const winningBid = job.bids.find(b => (b.installer as any).id === installerId);
            if (winningBid) {
                amount = winningBid.amount;
            }
        } else if (job.directAwardInstallerId && job.budget) {
            // For direct awards, use the budget field
            amount = (job.budget as any).min; // Using min as default for budget object structure
        }
    }
    
    if (amount <= 0 && !isSubscription) {
        return NextResponse.json({ error: 'Could not determine a valid bid amount for this job.' }, { status: 400 });
    }

    // 2. Calculate fees and final amounts based on platform settings
    const platformSettings = await getPlatformSettings();
    
    const calculatedJobGiverFee = isSubscription ? 0 : (amount * (platformSettings.jobGiverFeeRate! / 100));
    const calculatedCommission = isSubscription ? 0 : amount * (platformSettings.installerCommissionRate! / 100);
    const tipAmount = (job && job.travelTip) ? job.travelTip : 0;
    
    const totalPaidByGiver = amount + calculatedJobGiverFee + tipAmount;
    const payoutToInstaller = isSubscription ? 0 : (amount - calculatedCommission + tipAmount);

    // 3. Create a new Transaction document in Firestore
    const transactionId = `TXN-${jobId}-${Date.now()}`;
    const transactionRef = doc(db, 'transactions', transactionId);

    const newTransaction: Transaction = {
        id: transactionId,
        jobId,
        jobTitle,
        payerId: jobGiverId,
        payeeId: installerId,
        amount, 
        travelTip: tipAmount,
        commission: calculatedCommission,
        jobGiverFee: calculatedJobGiverFee,
        totalPaidByGiver: totalPaidByGiver,
        payoutToInstaller: payoutToInstaller,
        status: 'Initiated',
        transactionType: isSubscription ? 'SUBSCRIPTION' : 'JOB',
        planId: isSubscription ? planId : undefined,
        createdAt: Timestamp.now(),
    };
    
    await setDoc(transactionRef, newTransaction);
    
    if (!jobGiver) return NextResponse.json({ error: 'Job Giver not found' }, { status: 404 });

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
            return_url: isSubscription ? `https://cctv-job-connect.web.app/dashboard/billing?payment_status=success&order_id={order_id}` : `https://cctv-job-connect.web.app/dashboard/jobs/${jobId}?payment_status=success&order_id={order_id}`,
        },
        order_note: `Payment for: ${jobTitle}`
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
