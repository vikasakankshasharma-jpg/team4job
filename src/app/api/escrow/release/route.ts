
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/server-init';
import { Job, Transaction, User } from '@/lib/types';
import axios from 'axios';
import { logAdminAlert } from '@/lib/admin-logger';
import { sendServerEmail } from '@/lib/server-email';

// Cashfree Payouts Config (Production/Sandbox)
const CASHFREE_PAYOUT_URL = 'https://payout-gamma.cashfree.com/payouts';

async function getPayoutToken(): Promise<string> {
    const response = await axios.post(
        `${CASHFREE_PAYOUT_URL}/auth`,
        {},
        {
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': process.env.CASHFREE_PAYOUTS_CLIENT_ID,
                'X-Client-Secret': process.env.CASHFREE_PAYOUTS_CLIENT_SECRET,
            },
        }
    );
    if (response.data?.data?.token) return response.data.data.token;
    throw new Error('Failed to authenticate with Cashfree Payouts.');
}

import { releasePaymentSchema } from '@/lib/validations/escrow';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const idToken = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await req.json();
        const validation = releasePaymentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { jobId } = validation.data;

        const db = getAdminDb();
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

        const job = jobSnap.data() as Job;

        // Security: Only Job Giver can release
        const jobGiverId = typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id;
        if (jobGiverId !== userId) {
            return NextResponse.json({ error: 'Forbidden. Only Job Giver can release payment.' }, { status: 403 });
        }

        if (job.status !== 'Pending Confirmation') {
            return NextResponse.json({ error: 'Job is not ready for payment release.' }, { status: 400 });
        }

        // Get Transaction
        const transQuery = db.collection('transactions').where('jobId', '==', jobId).where('status', '==', 'Funded').limit(1);
        const transSnap = await transQuery.get();

        if (transSnap.empty) {
            return NextResponse.json({ error: 'No funded transaction found.' }, { status: 404 });
        }

        const transaction = transSnap.docs[0].data() as Transaction;
        const payoutAmount = transaction.payoutToInstaller;

        // Execute Payout via Cashfree
        // 1. Get Beneficiary (Installer)
        const installerId = transaction.payeeId;
        const installerSnap = await db.collection('users').doc(installerId).get();
        const beneId = installerSnap.data()?.payouts?.beneficiaryId;

        if (!beneId) {
            return NextResponse.json({ error: 'Installer has not set up payouts. Cannot release.' }, { status: 400 });
        }

        const host = req.headers.get('host') || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        const isE2E = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'dodo-beta' || isLocalhost;

        console.log(`[Release API] Debug: NODE_ENV=${process.env.NODE_ENV}, ProjectID=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}, Host=${host}, isE2E=${isE2E}`);

        // Check if automated payouts are configured
        const hasPayoutCredentials = !!(process.env.CASHFREE_PAYOUTS_CLIENT_ID && process.env.CASHFREE_PAYOUTS_CLIENT_SECRET);
        const useManualPayouts = !hasPayoutCredentials;

        let payoutStatus: 'automated' | 'manual' | 'simulated' = 'automated';

        if (isE2E) {
            // E2E Mode: Simulate payout success
            console.log(`[E2E/Beta] Skipping Cashfree Payout for Job ${jobId}. Simulating success.`);
            payoutStatus = 'simulated';
        } else if (useManualPayouts) {
            // Manual Mode: Skip automated payout, mark for manual processing
            console.log(`[Manual Mode] Cashfree Payouts not configured. Job ${jobId} marked for manual payout processing.`);
            payoutStatus = 'manual';

            // Log to admin for manual processing
            await logAdminAlert('INFO', `Manual Payout Required: Job ${jobId}`, {
                jobId,
                installerId,
                amount: payoutAmount,
                beneId,
                installerName: installerSnap.data()?.name,
                message: 'Automated payouts not enabled. Please process this payout manually via bank transfer.'
            });
        } else {
            // Automated Mode: Execute payout via Cashfree API
            try {
                const token = await getPayoutToken();
                await axios.post(
                    `${CASHFREE_PAYOUT_URL}/payouts/standard`,
                    {
                        beneId: beneId,
                        amount: payoutAmount.toFixed(2),
                        transferId: `PAYOUT-${jobId}-${Date.now()}`
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log(`[Automated] Payout sent via Cashfree API for Job ${jobId}`);
                payoutStatus = 'automated';
            } catch (e: any) {
                console.error("Payout API Fail", e?.response?.data || e);
                await logAdminAlert('CRITICAL', `Release Payment Failed (API Error): Job ${jobId}`, { error: e.message });
                return NextResponse.json({ error: 'Payout Gateway Error. Admin notified.' }, { status: 500 });
            }
        }

        // Initialize Invoice Data
        const installerData = installerSnap.data() as User;

        // Fetch Giver for Invoice To details
        const giverSnap = await db.collection('users').doc(userId).get();
        const giverData = giverSnap.data() as User;
        if (!giverData) throw new Error("Job Giver profile not found for invoice generation");

        // Billing Snapshot (Immutable record of installer details at time of invoice)
        const billingSnapshot = {
            installerName: installerData.name, // Use 'shopName' here? Use name for now.
            installerAddress: installerData.address,
            gstin: installerData.gstin || '',
            pan: installerData.panNumber || ''
        };

        // Calculate Totals (Service Invoice: Installer -> Job Giver)
        const subtotal = transaction.amount;
        const travelTip = transaction.travelTip || 0;
        const taxable = subtotal + travelTip;
        // Determine GST based on Installer registration
        const isGstRegistered = !!installerData.gstin;
        const invoiceGstRate = isGstRegistered ? 0.18 : 0;
        const invoiceTax = taxable * invoiceGstRate;
        const totalAmount = taxable + invoiceTax;

        const invoiceId = `INV-${jobId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

        const invoice = {
            id: invoiceId,
            jobId: jobId,
            jobTitle: job.title,
            date: new Date(),
            subtotal,
            travelTip,
            totalAmount,
            from: {
                name: installerData.name,
                gstin: installerData.gstin || ''
            },
            to: {
                name: giverData.name,
                gstin: giverData.gstin || ''
            }
        };

        // Update DB
        await jobRef.update({
            status: 'Completed',
            completedAt: new Date(),
            paymentReleasedAt: new Date(),
            invoice,
            billingSnapshot
        });

        await transSnap.docs[0].ref.update({
            status: payoutStatus === 'manual' ? 'Pending Payout' : 'Completed',
            releasedAt: new Date(),
            payoutMode: payoutStatus,
            ...(payoutStatus === 'manual' && { manualPayoutRequired: true })
        });

        // Emails (Non-blocking)
        try {
            if (!isE2E) { // Skip emails in E2E to avoid spam/errors
                // To Installer
                const installerEmail = installerSnap.data()?.email;
                if (installerEmail) {
                    await sendServerEmail(installerEmail, `Payment Released: ${job.title}`, `Good news! The Job Giver has released the payment of ₹${payoutAmount}. It should hit your bank shortly.`);
                }

                // To Giver
                const giverSnap = await db.collection('users').doc(userId).get();
                const giverEmail = giverSnap.data()?.email;
                if (giverEmail) {
                    await sendServerEmail(giverEmail, `Payment Receipt: ${job.title}`, `You have successfully released payment for Job ${job.title}. Project is marked Completed.`);
                }
            }
        } catch (emailError) {
            console.error("Email Notification Failed (Non-critical):", emailError);
        }

        // Return appropriate success message based on payout mode
        const successMessage = payoutStatus === 'manual'
            ? 'Job completed successfully! Payment will be processed manually within 24 hours.'
            : 'Payment released successfully. Funds transferred to installer.';

        return NextResponse.json({
            success: true,
            message: successMessage,
            payoutMode: payoutStatus,
            ...(payoutStatus === 'manual' && { note: 'Automated payouts not configured. Payment requires manual processing.' })
        });

    } catch (error: any) {
        console.error("Release Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
