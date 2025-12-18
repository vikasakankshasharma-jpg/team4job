
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server-init';
import { Job, Transaction } from '@/lib/types';
import axios from 'axios';

// Use sandbox for beta
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg';

export async function POST(req: NextRequest) {
    try {
        const { jobId, userId } = await req.json();

        if (!jobId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data() as Job;

        // Verify ownership
        if (typeof job.jobGiver === 'string') {
            if (job.jobGiver !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        } else if (job.jobGiver.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check status
        // Only allow refund if In Progress (Funded)
        if (job.status !== 'In Progress') {
            // If not funded (e.g. Open, Awarded but not paid), just cancel locally provided no one accepted? 
            // Actually, if it's 'Awarded', we might need to notify installer. 
            // But for 'Refund', we only care if money is held.
            // If money is NOT held, the client should use a different path or we handle it here simply.
            if (['Open', 'Awarded', 'Pending Confirmation'].includes(job.status)) { // Pending Confirmation means work done? No, Cancel should be disabled then.
                // Allow simple cancel if not funded.
                await jobRef.update({ status: 'Cancelled' });
                return NextResponse.json({ success: true, message: 'Job cancelled (no refund needed).' });
            }
            return NextResponse.json({ error: 'Job cannot be cancelled in this state.' }, { status: 400 });
        }

        // Find the funded transaction
        const transQuery = db.collection('transactions')
            .where('jobId', '==', jobId)
            .where('status', '==', 'Funded') // Or 'Initiated' if captured? 'Funded' is our tracking.
            .limit(1);

        const transSnap = await transQuery.get();

        if (transSnap.empty) {
            // Edge case: Job says funded but no txn? Just cancel.
            await jobRef.update({ status: 'Cancelled' });
            return NextResponse.json({ success: true, message: 'Job cancelled (no transaction found).' });
        }

        const transaction = transSnap.docs[0].data() as Transaction;
        const transactionId = transaction.paymentGatewayOrderId; // Ensure we stored this

        if (!transactionId) {
            return NextResponse.json({ error: 'Payment gateway order ID missing.' }, { status: 500 });
        }

        // Trigger Cashfree Refund
        // POST /orders/{order_id}/refunds
        const refundPayload = {
            refund_amount: transaction.totalPaidByGiver, // Full refund
            refund_id: `REF-${jobId}-${Date.now()}`,
            refund_note: "Job Cancelled by User"
        };

        const response = await axios.post(
            `${CASHFREE_API_BASE}/orders/${transactionId}/refunds`,
            refundPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': process.env.CASHFREE_PAYMENTS_CLIENT_ID,
                    'x-client-secret': process.env.CASHFREE_PAYMENTS_CLIENT_SECRET,
                    'x-api-version': '2022-09-01',
                },
            }
        );

        // Update DB
        await jobRef.update({ status: 'Cancelled' });
        await transSnap.docs[0].ref.update({ status: 'Refunded' });

        return NextResponse.json({ success: true, refund_id: response.data.refund_id });

    } catch (error: any) {
        console.error('Refund failed:', error.response?.data || error.message);
        return NextResponse.json({ error: error.response?.data?.message || 'Refund failed' }, { status: 500 });
    }
}
