
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server-init';
import { Job, Transaction } from '@/lib/types';
import axios from 'axios';

// CASHFREE PAYOUTS CONFIG (Same as release-funds)
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
    return response.data?.data?.token;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // SECURITY: Verify secret to prevent unauthorized triggers
        const authHeader = req.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));

        // 1. Find jobs in 'Pending Confirmation' submitted more than 5 days ago
        const db = getAdminDb();
        const jobsSnap = await db.collection('jobs')
            .where('status', '==', 'Pending Confirmation')
            .where('workSubmittedAt', '<=', fiveDaysAgo)
            .get();

        if (jobsSnap.empty) {
            return NextResponse.json({ message: 'No jobs eligible for auto-settle.' });
        }

        const results = [];
        const token = await getCashfreeBearerToken();

        for (const jobDoc of jobsSnap.docs) {
            const job = jobDoc.data() as Job;

            // 2. Find the funded transaction for this job
            const txnSnap = await db.collection('transactions')
                .where('jobId', '==', jobDoc.id)
                .where('status', '==', 'Funded')
                .limit(1)
                .get();

            if (txnSnap.empty) {
                results.push({ jobId: jobDoc.id, status: 'Error', reason: 'No funded transaction found' });
                continue;
            }

            const txnDoc = txnSnap.docs[0];
            const transaction = txnDoc.data() as Transaction;

            // 3. Trigger Payout (Replicating release-funds logic)
            const installerSnap = await db.collection('users').doc(transaction.payeeId).get();
            if (!installerSnap.exists || !installerSnap.data()?.payouts?.beneficiaryId) {
                results.push({ jobId: jobDoc.id, status: 'Error', reason: 'Missing beneficiary details' });
                continue;
            }

            const beneficiaryId = installerSnap.data()?.payouts?.beneficiaryId;
            const transferId = `AUTO_SETTLE_${transaction.id}`;

            try {
                await axios.post(
                    `${CASHFREE_API_BASE}/payouts/standard`,
                    {
                        beneId: beneficiaryId,
                        amount: transaction.payoutToInstaller.toFixed(2),
                        transferId: transferId,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );

                // Update Transaction & Job
                await txnDoc.ref.update({
                    payoutTransferId: transferId,
                    status: 'Released',
                    releasedAt: now
                });

                await jobDoc.ref.update({
                    status: 'Completed',
                    completionTimestamp: now,
                    adminNotes: (job.adminNotes || '') + '\n[System] Auto-settled after 5 days of inactivity.'
                });

                results.push({ jobId: jobDoc.id, status: 'Success', transferId });

            } catch (err: any) {
                results.push({ jobId: jobDoc.id, status: 'Failed', error: err.message });
            }
        }

        return NextResponse.json({ processed: results.length, results });

    } catch (error: any) {
        console.error('Auto-settle Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
