
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server-init';
import { User, Transaction, Job, PlatformSettings } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';

// Switch to sandbox for beta testing (zero cost)
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

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { jobId, otp, completionAttachments } = await req.json();

        if (!jobId || !otp) {
            return NextResponse.json({ error: 'Missing jobId or OTP' }, { status: 400 });
        }

        const db = getAdminDb();
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data() as Job;

        // Phase 19: Security - Brute Force Protection
        // Lazy load rate limiter
        const checkRateLimit = (await import('@/lib/services/rate-limit')).checkRateLimit;
        // Check Limit for Installer (who is submitting OTP)
        const installerId = typeof job.awardedInstaller === 'string'
            ? job.awardedInstaller
            : (job.awardedInstaller as any)?.id;

        const limitCheck = await checkRateLimit(installerId, 'otp_verify');

        if (!limitCheck.allowed) {
            return NextResponse.json({ error: "Too many attempts. Please try again tomorrow or contact support." }, { status: 429 });
        }

        // Verify OTP
        if (!job.completionOtp || job.completionOtp !== otp) {
            return NextResponse.json({ error: 'Invalid or missing OTP.' }, { status: 400 });
        }

        // Find the funded transaction
        const transQuery = db.collection('transactions')
            .where('jobId', '==', jobId)
            .where('status', '==', 'Funded')
            .limit(1);

        const transSnap = await transQuery.get();

        if (transSnap.empty) {
            return NextResponse.json({ error: 'No funded transaction found for this job.' }, { status: 400 });
        }

        const transaction = transSnap.docs[0].data() as Transaction;
        const transactionRef = transSnap.docs[0].ref;

        // --- Payout Logic ---
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

        // Optimistically update the status.
        await transactionRef.update({
            payoutTransferId: transferId,
            status: 'Released'
        });
        // --- End Payout Logic ---

        // Update Job Status and Attachments
        const updates: any = {
            status: 'Completed',
            completionOtp: FieldValue.delete() // Invalidate OTP after use
        };

        if (completionAttachments && completionAttachments.length > 0) {
            updates.attachments = FieldValue.arrayUnion(...completionAttachments);
        }

        await jobRef.update(updates);

        return NextResponse.json({ success: true, transferId });

    } catch (error: any) {
        console.error('Error verifying OTP and releasing funds:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || 'Failed to complete job and request payout.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
