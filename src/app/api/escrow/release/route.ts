
import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase/server-init';
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

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { jobId } = await req.json();

        if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

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
        } catch (e: any) {
            console.error("Payout API Fail", e?.response?.data || e);
            await logAdminAlert('CRITICAL', `Release Payment Failed (API Error): Job ${jobId}`, { error: e.message });
            return NextResponse.json({ error: 'Payout Gateway Error. Admin notified.' }, { status: 500 });
        }

        // Update DB
        await jobRef.update({
            status: 'Completed',
            completedAt: new Date(),
            paymentReleasedAt: new Date()
        });

        await transSnap.docs[0].ref.update({ status: 'Completed', releasedAt: new Date() });

        // Emails
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

        return NextResponse.json({ success: true, message: 'Payment released successfully.' });

    } catch (error: any) {
        console.error("Release Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
