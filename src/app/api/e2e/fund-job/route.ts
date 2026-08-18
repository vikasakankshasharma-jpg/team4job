// app/api/e2e/fund-job/route.ts - REFACTORED to use infrastructure

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';

import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const isE2eAllowed = () => {
    return process.env.NEXT_PUBLIC_E2E === 'true' && process.env.ALLOW_E2E_SEED === 'true';
};

/**
 * E2E Test Helper: Fund a job instantly for testing
 * ✅ REFACTORED: Uses infrastructure logger and Firebase
 */
export async function POST(req: NextRequest) {
    if (!isE2eAllowed()) {
        return NextResponse.json(
            { error: 'Not allowed in production' },
            { status: 403 }
        );
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

        const newTransaction = {
            id: transactionId,
            jobId,
            jobTitle: job?.title || 'Unknown',
            payerId:
                job?.clientId || (job?.client ? (job.client as any).id : 'UNKNOWN'),
            payeeId:
                job?.awardedProfessionalId ||
                (job?.awardedProfessional
                    ? (job.awardedProfessional as any).id
                    : 'ESCROW_HOLD'),
            amount: 1000,
            status: 'funded',
            transactionType: 'JOB',
            createdAt: Timestamp.now(),
            fundedAt: Timestamp.now(),
            paymentGatewayOrderId: `TEST_ORDER_${Date.now()}`,
            paymentGatewaySessionId: `TEST_SESSION_${Date.now()}`,
            totalPaidByClient: 2360,
            payoutToProfessional: 2000,
            platformFee: 360,
        };

        await transactionRef.set(newTransaction);

        // Update Job Status
        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await jobRef.update({
            status: 'In Progress',
            startOtp: dummyOtp,
            fundingDeadline: null,
        });



        return NextResponse.json({ success: true, transactionId, startOtp: dummyOtp });
    } catch (error: any) {

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

