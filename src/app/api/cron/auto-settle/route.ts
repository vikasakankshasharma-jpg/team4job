// app/api/cron/auto-settle/route.ts - REFACTORED

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';

import { Job, Transaction } from '@/lib/types';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const CASHFREE_API_BASE = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'https://payout-api.cashfree.com/payouts' : 'https://payout-gamma.cashfree.com/payouts';

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

/**
 * Auto-settle cron job - Automatically settles jobs after 5 days
 * ✅ REFACTORED: Uses infrastructure logger and Firebase
 * 
 * Triggered by Cloud Scheduler or external cron service
 */
export async function GET(req: NextRequest) {
    try {
        // SECURITY: Verify cron secret
        const authHeader = req.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {

            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

        // Find jobs in 'Pending Confirmation' submitted >5 days ago
        const db = getAdminDb();
        const jobsSnap = await db
            .collection('jobs')
            .where('status', '==', 'Pending Confirmation')
            .where('workSubmittedAt', '<=', fiveDaysAgo)
            .get();

        if (jobsSnap.empty) {

            return NextResponse.json({ message: 'No jobs eligible for auto-settle' });
        }

        const results = [];
        const token = await getCashfreeBearerToken();

        for (const jobDoc of jobsSnap.docs) {
            const job = jobDoc.data() as Job;

            // Find funded transaction for this job
            const txnSnap = await db
                .collection('transactions')
                .where('jobId', '==', jobDoc.id)
                .where('status', '==', 'funded')
                .limit(1)
                .get();

            if (txnSnap.empty) {
                results.push({
                    jobId: jobDoc.id,
                    status: 'Error',
                    reason: 'No funded transaction found',
                });
                continue;
            }

            const txnDoc = txnSnap.docs[0];
            const transaction = txnDoc.data() as Transaction;

            // Check Professional beneficiary details
            const ProfessionalSnap = await db.collection('users').doc(transaction.payeeId).get();
            if (!ProfessionalSnap.exists || !ProfessionalSnap.data()?.payouts?.beneficiaryId) {
                results.push({
                    jobId: jobDoc.id,
                    status: 'Error',
                    reason: 'Missing beneficiary details',
                });
                continue;
            }

            const beneficiaryId = ProfessionalSnap.data()?.payouts?.beneficiaryId;
            const transferId = `AUTO_SETTLE_${transaction.id}`;

            try {
                // Check if we are in manual payout mode
                const isManualMode = process.env.NEXT_PUBLIC_PAYOUT_MODE === 'MANUAL';

                if (!isManualMode) {
                    // AUTOMATED MODE: Trigger Cashfree payout
                    await axios.post(
                        `${CASHFREE_API_BASE}/payouts/standard`,
                        {
                            beneId: beneficiaryId,
                            amount: transaction.payoutToProfessional.toFixed(2),
                            transferId: transferId,
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    // Update transaction & job to fully released
                    await txnDoc.ref.update({
                        payoutTransferId: transferId,
                        status: 'paid_out',
                        releasedAt: now,
                    });
                } else {
                    // MANUAL MODE: Just mark it as pending payout for the admin dashboard
                    await txnDoc.ref.update({
                        status: 'payout_pending',
                        releasedAt: now,
                    });
                }

                await jobDoc.ref.update({
                    status: 'Completed',
                    financialStatus: isManualMode ? 'payout_pending' : 'paid_out',
                    completionTimestamp: now,
                    adminNotes:
                        (job.adminNotes || '') +
                        `\n[System] Auto-settled after 5 days of inactivity. Mode: ${isManualMode ? 'MANUAL' : 'AUTOMATED'}`,
                });

                results.push({ jobId: jobDoc.id, status: 'Success', transferId, mode: isManualMode ? 'MANUAL' : 'AUTOMATED' });

            } catch (err: any) {
                results.push({ jobId: jobDoc.id, status: 'Failed', error: err.message });
            }
        }



        return NextResponse.json({ processed: results.length, results });
    } catch (error: any) {

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
