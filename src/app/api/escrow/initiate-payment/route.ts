
import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/server-init';
import { Job, User, Transaction, PlatformSettings, SubscriptionPlan } from '@/lib/types';
import axios from 'axios';

// Use 'https://api.cashfree.com/pg' for production
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

async function getPlatformSettings(): Promise<Partial<PlatformSettings>> {
    const db = getAdminDb();
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

import { initiatePaymentSchema } from '@/lib/validations/escrow';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const adminAuth = getAdminAuth();
        const db = getAdminDb();
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

        const body = await req.json();
        const validation = initiatePaymentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { jobId, planId, taskId } = validation.data;

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
                // Determine the amount from the winning bid
                // Get 'awardedInstaller' ID
                const awardedId = (job.awardedInstaller as any).id || job.awardedInstaller;
                // If it's a reference, we might need to be careful, but usually .id works on Firestore refs in Admin SDK if they are objects, 
                // or if it's a string.
                // Actually, job.awardedInstaller in Admin SDK is a Reference object usually.
                // Let's safe cast.
                let installerIdString = '';
                if (typeof job.awardedInstaller === 'string') {
                    installerIdString = job.awardedInstaller;
                } else if (job.awardedInstaller && (job.awardedInstaller as any).id) {
                    installerIdString = (job.awardedInstaller as any).id;
                } else if (job.awardedInstallerId) {
                    installerIdString = job.awardedInstallerId;
                }

                installerId = installerIdString;

                if (job.bids && job.bids.length > 0) {
                    // Legacy Array Logic
                    const winningBid = job.bids.find(b => (b.installer as any).id === installerIdString || (b.installer as any) === installerIdString);
                    if (winningBid) {
                        amount = winningBid.amount;
                    }
                }

                // Fallback: Check Sub-collection if amount is still 0
                if (amount === 0 && installerIdString) {
                    const bidsSnap = await db.collection('jobs').doc(jobId).collection('bids')
                        .where('installerId', '==', installerIdString).limit(1).get();
                    if (!bidsSnap.empty) {
                        amount = bidsSnap.docs[0].data().amount;
                    }
                }

                if (amount === 0 && job.directAwardInstallerId && (job as any).budget) {
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
            ...(isSubscription ? { planId } : {}),
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
                return_url: isSubscription
                    ? `${req.headers.get('origin') || 'https://dodo-beta.web.app'}/dashboard/billing?payment_status=success&order_id={order_id}`
                    : `${req.headers.get('origin') || 'https://dodo-beta.web.app'}/dashboard/jobs/${jobId}?payment_status=success&order_id={order_id}`,
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
