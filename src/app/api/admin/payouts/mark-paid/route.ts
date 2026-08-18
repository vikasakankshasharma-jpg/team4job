import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';
import { TRANSACTION_STATUS, JOB_STATUS } from '@/lib/constants/statuses';
import { paymentService } from '@/domains/payments/payment.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const token = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        
        if (!decodedToken.roles?.includes('admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { transactionId, manualReference } = await req.json();

        if (!transactionId) {
            return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
        }

        const db = getAdminDb();
        const transactionRef = db.collection('transactions').doc(transactionId);
        const transaction = await transactionRef.get();

        if (!transaction.exists) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const data = transaction.data();

        if (data?.status !== TRANSACTION_STATUS.PAYOUT_PENDING) {
            return NextResponse.json({ error: 'Transaction is not pending payout' }, { status: 400 });
        }

        // Run as a transaction to ensure atomicity
        await db.runTransaction(async (t) => {
            const txData = (await t.get(transactionRef)).data();
            if (txData?.status !== TRANSACTION_STATUS.PAYOUT_PENDING) {
                throw new Error('Transaction is not pending payout');
            }

            const now = new Date();

            t.update(transactionRef, {
                status: TRANSACTION_STATUS.PAID_OUT,
                payoutTransferId: \MANUAL_\,
                payoutCompletedAt: now,
                updatedAt: now
            });

            if (txData?.jobId) {
                const jobRef = db.collection('jobs').doc(txData.jobId);
                t.update(jobRef, {
                    financialStatus: TRANSACTION_STATUS.PAID_OUT,
                    updatedAt: now
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Mark Payout Paid Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
