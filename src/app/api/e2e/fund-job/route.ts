
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';
import { Transaction } from '@/lib/types'; // Assuming Transaction type usage matches

export async function POST(req: NextRequest) {
    // Allow in production if it's the beta environment or specifically enabled
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'dodo-beta') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const body = await req.json();
        console.log('[E2E Fund] Received body:', body);
        const { jobId } = body;

        if (!jobId) {
            console.error('[E2E Fund] Missing jobId in body');
            return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        const job = jobSnap.data();

        // Create Funded Transaction
        const transactionId = `TXN-${jobId}-${Date.now()}`;
        const transactionRef = db.collection('transactions').doc(transactionId);

        const newTransaction = {
            id: transactionId,
            jobId,
            jobTitle: job?.title || 'Unknown',
            payerId: job?.jobGiverId || (job?.jobGiver as any).id,
            payeeId: job?.awardedInstallerId || (job?.awardedInstaller as any).id,
            amount: 1000, // Dummy amount
            status: 'Funded',
            transactionType: 'JOB',
            createdAt: Timestamp.now(),
            fundedAt: Timestamp.now(),
            paymentGatewayOrderId: `TEST_ORDER_${Date.now()}`,
            paymentGatewaySessionId: `TEST_SESSION_${Date.now()}`
        };

        await transactionRef.set(newTransaction);

        // Update Job Status
        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await jobRef.update({
            status: 'In Progress',
            startOtp: dummyOtp,
            fundingDeadline: null // Remove deadline
            // arrayRemove logic isn't easily done here without importing FieldValue from admin, 
            // but for E2E 'In Progress' is the key status.
        });

        console.log(`[E2E Fund] Job ${jobId} funded and started via API`);

        return NextResponse.json({ success: true, transactionId, startOtp: dummyOtp });

    } catch (error: any) {
        console.error('[E2E Fund] Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
