
import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db, adminAuth } from '@/lib/firebase/server-init';
import { Job, User, Transaction, PlatformSettings, SubscriptionPlan } from '@/lib/types';
import axios from 'axios';

// Use 'https://api.cashfree.com/pg' for production
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

async function getPlatformSettings(): Promise<Partial<PlatformSettings>> {
    const settingsRef = db.collection('settings').doc('platform');
    const settingsSnap = await settingsRef.get();
    if (settingsSnap.exists) {
        return settingsSnap.data() as PlatformSettings;
    }
    // Return default values if no settings are configured
    return {
        installerCommissionRate: 5,
        jobGiverFeeRate: 5,
    };
}

export async function POST(req: NextRequest) {
    try {
        // 1. Authorization & Security Check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const authenticatedUserId = decodedToken.uid;

        const { jobId, planId, taskId } = await req.json(); // REMOVED: jobGiverId from body

        if (!jobId) {
            return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 });
        }

        // Check if it is a subscription payment
        const isSubscription = jobId.startsWith('SUB-');
        let amount = 0;
        let jobTitle = '';
        let installerId = 'PLATFORM';
        let job: Job | null = null;
        let jobGiver: User | null = null;

        // We use the authenticated user ID as the jobGiverId
        const jobGiverId = authenticatedUserId;

        if (isSubscription) {
            if (!planId) {
                return NextResponse.json({ error: 'Plan ID is required for subscription payments.' }, { status: 400 });
            }

            const [planSnap, userSnap] = await Promise.all([
                db.collection('subscriptionPlans').doc(planId).get(),
                db.collection('users').doc(jobGiverId).get()
            ]);

            if (!planSnap.exists) return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
            if (!userSnap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            const plan = planSnap.data() as SubscriptionPlan;
            jobGiver = userSnap.data() as User;

            amount = plan.price;
            jobTitle = `Subscription: ${plan.name}`;

        } else {
            // Handle Standard Job Payment or Additional Task Payment
            const jobRef = db.collection('jobs').doc(jobId);
            const [jobSnap, jobGiverSnap] = await Promise.all([
                jobRef.get(),
                db.collection('users').doc(jobGiverId).get(),
            ]);

            if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
            if (!jobGiverSnap.exists) return NextResponse.json({ error: 'Job Giver not found' }, { status: 404 });

            job = jobSnap.data() as Job;
            jobGiver = jobGiverSnap.data() as User;
            jobTitle = job.title;

            // SECURITY CHECK: Ensure the authenticated user is actually the owner of this job
            const jobOwnerId = (job.jobGiver as any).id || (job.jobGiver as any).path?.split('/').pop() || job.jobGiverId;
            if (jobOwnerId !== jobGiverId) {
                return NextResponse.json({ error: 'Forbidden: You are not the owner of this job.' }, { status: 403 });
            }

            if (!job.awardedInstaller) return NextResponse.json({ error: 'Job has no awarded installer' }, { status: 400 });

            // Handle Additional Task or Standard Job Amount
            if (taskId) {
                const task = job.additionalTasks?.find(t => t.id === taskId);
                if (!task || !task.quoteAmount) {
                    return NextResponse.json({ error: 'Additional task not found or quote missing.' }, { status: 404 });
                }
                amount = task.quoteAmount;
                jobTitle = `Additional Task: ${task.description.substring(0, 30)}...`;
            } else {
                // Determine the amount from the winning bid for regular jobs
                if (job.bids && job.bids.length > 0) {
                    // Logic for finding winning bid from array (Old Way)
                    // If we have migrated to sub-collections, this part needs to change to fetch the specific bid doc.
                    // IMPORTANT: Since we are in transition, let's look at 'awardedInstaller' ID and find the matching bid
                    // OR rely on a stored 'agreedPrice' on the job if we had one.
                    // The safer bet is trusting the bid amount that matched the installer.

                    // Get 'awardedInstaller' ID
                    const awardedId = (job.awardedInstaller as any).id || job.awardedInstaller;
                    installerId = awardedId;

                    const winningBid = job.bids.find(b => (b.installer as any).id === awardedId || b.installer === awardedId);
                    if (winningBid) {
                        amount = winningBid.amount;
                    }
                } else if (job.directAwardInstallerId && (job as any).budget) {
                    amount = (job as any).budget.min;
                    installerId = job.directAwardInstallerId;
                }
            }
        }

        if (amount <= 0 && !isSubscription) {
            return NextResponse.json({ error: 'Could not determine a valid bid amount for this job.' }, { status: 400 });
        }

        // 2. Calculate fees and final amounts based on platform settings
        const platformSettings = await getPlatformSettings();

        let commissionRate = platformSettings.installerCommissionRate! / 100;
        if (job && job.jobCategory && platformSettings.categoryCommissionRates?.[job.jobCategory]) {
            commissionRate = platformSettings.categoryCommissionRates[job.jobCategory] / 100;
        }

        const calculatedJobGiverFee = isSubscription ? 0 : (amount * (platformSettings.jobGiverFeeRate! / 100));
        const calculatedCommission = isSubscription ? 0 : amount * commissionRate;
        const tipAmount = (job && job.travelTip) ? job.travelTip : 0;

        const totalPaidByGiver = amount + calculatedJobGiverFee + tipAmount;
        const payoutToInstaller = isSubscription ? 0 : (amount - calculatedCommission + tipAmount);

        // 3. Create a new Transaction document in Firestore
        const transactionId = `TXN-${jobId}-${Date.now()}`;
        const transactionRef = db.collection('transactions').doc(transactionId);

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
            createdAt: Timestamp.now() as any,
        };

        // Admin SDK can write freely, bypassing rules.
        await transactionRef.set(newTransaction);

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
        await transactionRef.update({
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
