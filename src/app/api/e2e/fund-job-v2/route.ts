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
        const text = await req.text();
        console.log(`[E2E-FUND] Request Body: "${text}"`);
        if (!text) {
            return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
        }
        const body = JSON.parse(text);
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        const db = getAdminDb();
        console.log(`[E2E-FUND] Processing Job ID: ${jobId}`);
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) {
            console.error(`[E2E-FUND] Job Not Found in Firestore: ${jobId}`);
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        console.log(`[E2E-FUND] Job Found: ${jobSnap.id}, Current Status: ${jobSnap.data()?.status}`);
        const job = jobSnap.data();

        // Create Funded Transaction
        const transactionId = `TXN-${jobId}-${Date.now()}`;
        const transactionRef = db.collection('transactions').doc(transactionId);

        const authHeader = req.headers.get('Authorization');
        let payerId = job?.clientId || (job?.client?.id) || 'UNKNOWN';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split('Bearer ')[1];
                const decodedToken = await getAdminAuth().verifyIdToken(token);
                payerId = decodedToken.uid;
            } catch (e) {
                // Ignore auth errors in E2E route
            }
        }

        const newTransaction = {
            id: transactionId,
            jobId,
            jobTitle: job?.title || 'Unknown',
            payerId: payerId,
            payeeId: job?.awardedProfessionalId || (job?.awardedProfessional?.id) || 'ESCROW_HOLD',
            amount: 1000,
            status: 'funded',
            transactionType: 'JOB',
            createdAt: Timestamp.now(),
            fundedAt: Timestamp.now(),
            paymentGatewayOrderId: `TEST_ORDER_${Date.now()}`,
            paymentGatewaySessionId: `TEST_SESSION_${Date.now()}`,
            totalPaidByClient: 2360,
            payoutToProfessional: 2000,
            clientFee: 360,
            commission: 100
        };

        await transactionRef.set(newTransaction);

        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const completionOtp = Math.floor(100000 + Math.random() * 900000).toString();

        console.log(`[E2E-FUND] Updating status to 'In Progress' for Job: ${jobId}`);
        await jobRef.update({
            status: 'In Progress',
            startOtp: dummyOtp,
            completionOtp: completionOtp,
            fundingDeadline: null,
            transactionId: transactionId,
            workStartedAt: FieldValue.delete()
        });
        console.log(`[E2E-FUND] Successfully updated Job: ${jobId}`);

        return NextResponse.json({ success: true, transactionId, startOtp: dummyOtp });

    } catch (error: any) {
        console.error('[E2E-FUND] Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Unknown error',
            stack: error.stack
        }, { status: 500 });
    }
}

