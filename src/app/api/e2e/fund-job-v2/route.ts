import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';

import { Timestamp, FieldValue } from 'firebase-admin/firestore';




const isE2eAllowed = () => {
    return true;
};

export async function POST(req: NextRequest) {
    if (!isE2eAllowed()) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const body = await req.json();

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

            } catch (e) {

            }
        }

        const newTransaction = {
            id: transactionId,
            jobId,
            jobTitle: job?.title || 'Unknown',
            payerId: payerId,
            payeeId: job?.awardedInstallerId || (job?.awardedInstaller?.id) || 'ESCROW_HOLD',
            amount: 1000,
            status: 'funded',
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

        // The instruction seems to be for an E2E test file, not this API route.
        // Inserting the line `await page.waitForTimeout(5000); // Wait for Firestore to stabilize
        // await page.reload();
        // await helper.job.waitForJobStatus('In Progress');` here would cause a syntax error
        // and reference undefined 'page' and 'helper' objects.
        // Assuming the intent was to ensure the job status is set to 'In Progress' in this API route,
        // the existing code already does that in the jobRef.update call below.
        // If the line was meant to be added to an E2E test, it should be placed there.
        // For this API route, no change is made based on the provided snippet to maintain syntactical correctness.

        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const completionOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const jobBefore = (await jobRef.get()).data();


        await jobRef.update({
            status: 'In Progress',
            startOtp: dummyOtp,
            completionOtp: completionOtp,
            fundingDeadline: null,
            transactionId: transactionId, // Associate transaction for invoices
            workStartedAt: FieldValue.delete()
        });

        const jobAfter = (await jobRef.get()).data();


        return NextResponse.json({ success: true, transactionId, startOtp: dummyOtp });

    } catch (error: any) {

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
