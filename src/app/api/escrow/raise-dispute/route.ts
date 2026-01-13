
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/server-init';
import { Job, Transaction } from '@/lib/types';
import { logAdminAlert } from '@/lib/admin-logger';
import { sendServerEmail } from '@/lib/server-email';

import { raiseDisputeSchema } from '@/lib/validations/escrow';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const idToken = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await req.json();
        const validation = raiseDisputeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { jobId, reason, description } = validation.data;



        const db = getAdminDb();
        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

        const job = jobSnap.data() as Job;

        // Verify User is Involved
        const jobGiverId = typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id;
        const installerId = typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id;

        if (userId !== jobGiverId && userId !== installerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create Dispute Doc
        const disputeRef = await db.collection('disputes').add({
            jobId,
            raisedBy: userId,
            raisedByRole: userId === jobGiverId ? 'Job Giver' : 'Installer',
            reason,
            description,
            status: 'Open',
            createdAt: new Date()
        });

        // Update Job Status
        await jobRef.update({ status: 'Disputed' });

        // Update Transaction Status (Freeze Funds)
        const transQuery = db.collection('transactions').where('jobId', '==', jobId).limit(1);
        const transSnap = await transQuery.get();
        if (!transSnap.empty) {
            await transSnap.docs[0].ref.update({ status: 'Disputed' });
        }

        // Alerts
        await logAdminAlert('CRITICAL', `New Dispute Raised: Job ${jobId}`, { disputeId: disputeRef.id, reason });

        // Email to Admin (Already handled by logAdminAlert CRITICAL)

        // Email to Counterparty
        const counterpartyId = userId === jobGiverId ? installerId : jobGiverId;
        if (counterpartyId) {
            const userSnap = await db.collection('users').doc(counterpartyId).get();
            const email = userSnap.data()?.email;
            if (email) {
                await sendServerEmail(email, `Dispute Raised: ${job.title}`, `The other party has raised a dispute regarding this job. Funds are frozen until Admin resolution.\nReason: ${reason}`);
            }
        }

        return NextResponse.json({ success: true, message: 'Dispute raised. Admin has been notified.' });

    } catch (error: any) {
        console.error("Raise Dispute Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
