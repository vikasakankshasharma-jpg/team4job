
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'dodo-beta') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const body = await req.json();
        console.log('[E2E Fund V2] Received body:', body);
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        const db = getAdminDb();
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        const job = jobSnap.data();

        // Create Funded Transaction
        const transactionId = `TXN-${jobId}-${Date.now()}`;
        const transactionRef = db.collection('transactions').doc(transactionId);

        const authHeader = req.headers.get('Authorization');
        let payerId = job?.jobGiverId || (job?.jobGiver?.id) || 'UNKNOWN';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split('Bearer ')[1];
                const decodedToken = await getAdminAuth().verifyIdToken(token);
                payerId = decodedToken.uid;
                console.log(`[E2E Fund V2] Verified Payer ID from Token: ${payerId}`);
            } catch (e) {
                console.warn('[E2E Fund V2] Token verification failed, falling back to job data', e);
            }
        }

        const newTransaction = {
            id: transactionId,
            jobId,
            jobTitle: job?.title || 'Unknown',
            payerId: payerId,
            payeeId: job?.awardedInstallerId || (job?.awardedInstaller?.id) || 'ESCROW_HOLD',
            amount: 1000,
            status: 'Funded',
            transactionType: 'JOB',
            createdAt: Timestamp.now(),
            fundedAt: Timestamp.now(),
            paymentGatewayOrderId: `TEST_ORDER_${Date.now()}`,
            paymentGatewaySessionId: `TEST_SESSION_${Date.now()}`,
            totalPaidByGiver: 2360,
            payoutToInstaller: 2000,
            jobGiverFee: 360,
            commission: 100
        };

        await transactionRef.set(newTransaction);

        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await jobRef.update({
            status: 'In Progress',
            startOtp: dummyOtp,
            fundingDeadline: null
        });

        console.log(`[E2E Fund V2] Job ${jobId} funded via API V2`);

        return NextResponse.json({ success: true, transactionId, startOtp: dummyOtp });

    } catch (error: any) {
        console.error('[E2E Fund V2] Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
