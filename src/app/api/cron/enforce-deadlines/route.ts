import { NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { paymentService } from '@/domains/payments/payment.service';
import { jobRepository } from '@/domains/jobs/job.repository';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const db = getAdminDb();
        const now = Timestamp.now();
        const results = {
            revokedAwards: 0,
            cancelledJobs: 0,
            errors: 0
        };

        // 1. Enforce Acceptance Deadlines (Jobs in 'Pending Acceptance')
        const pendingJobsSnapshot = await db.collection('jobs')
            .where('status', '==', 'Pending Acceptance')
            .get();

        for (const doc of pendingJobsSnapshot.docs) {
            const jobData = doc.data();
            if (jobData.acceptanceDeadline && jobData.acceptanceDeadline.toMillis() < now.toMillis()) {
                try {
                    // Revoke award and reset to Open
                    await db.collection('jobs').doc(doc.id).update({
                        status: 'Open for Bidding',
                        awardedProfessionalId: null,
                        awardedProfessional: null,
                        acceptanceDeadline: null,
                        updatedAt: now
                    });
                    
                    // Add audit log
                    await db.collection('auditLogs').add({
                        jobId: doc.id,
                        action: 'award_revoked',
                        reason: 'Acceptance deadline expired',
                        timestamp: now,
                        performedBy: 'system_cron'
                    });
                    
                    results.revokedAwards++;
                } catch (e) {
                    console.error(`Failed to revoke award for job ${doc.id}:`, e);
                    results.errors++;
                }
            }
        }

        // 2. Enforce Funding Deadlines (Jobs in 'Pending Confirmation')
        // Wait, "Pending Confirmation" means waiting for client to approve completion.
        // Or "Pending Deposit" / "Awarded"?
        // If a job is Awarded (accepted by pro), the client must fund the escrow.
        const awardedJobsSnapshot = await db.collection('jobs')
            .where('status', '==', 'Awarded')
            .get();

        for (const doc of awardedJobsSnapshot.docs) {
            const jobData = doc.data();
            if (jobData.fundingDeadline && jobData.fundingDeadline.toMillis() < now.toMillis()) {
                try {
                    // Cancel the job since client didn't fund in time
                    await db.collection('jobs').doc(doc.id).update({
                        status: 'Cancelled',
                        cancellationReason: 'Funding deadline expired',
                        cancellationProposer: 'System',
                        updatedAt: now
                    });
                    
                    // Log it
                    await db.collection('auditLogs').add({
                        jobId: doc.id,
                        action: 'job_cancelled',
                        reason: 'Funding deadline expired',
                        timestamp: now,
                        performedBy: 'system_cron'
                    });
                    
                    results.cancelledJobs++;
                } catch (e) {
                    console.error(`Failed to cancel unfunded job ${doc.id}:`, e);
                    results.errors++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Deadline enforcement completed',
            results
        });
    } catch (error: any) {
        console.error('Deadline enforcement error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
