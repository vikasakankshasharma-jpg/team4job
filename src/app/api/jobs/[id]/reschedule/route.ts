import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/server-init';
import { Job } from '@/lib/types';
import { logAdminAlert } from '@/lib/admin-logger';
import { sendServerEmail } from '@/lib/server-email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const jobId = id;
        const { action, proposedDate, userId, userRole } = await req.json();

        if (!jobId || !action || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data() as Job;

        // Security Check: Only involved parties
        const isJobGiver = typeof job.jobGiver === 'string' ? job.jobGiver === userId : job.jobGiver.id === userId;
        const isInstaller = job.awardedInstaller ? (typeof job.awardedInstaller === 'string' ? job.awardedInstaller === userId : job.awardedInstaller.id === userId) : false;

        if (!isJobGiver && !isInstaller) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Action Handling
        if (action === 'propose') {
            if (!proposedDate) return NextResponse.json({ error: 'Proposed date is required' }, { status: 400 });

            await jobRef.update({
                dateChangeProposal: {
                    newDate: new Date(proposedDate),
                    proposedBy: isJobGiver ? 'Job Giver' : 'Installer',
                    status: 'pending'
                }
            });

            // Notify Counterparty
            const counterpartyId = isJobGiver ?
                (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id)
                : (typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver?.id);

            if (counterpartyId) {
                const userSnap = await db.collection('users').doc(counterpartyId).get();
                const email = userSnap.data()?.email;
                if (email) {
                    await sendServerEmail(
                        email,
                        `Action Required: Reschedule Proposed for Job: ${job.title}`,
                        `The ${isJobGiver ? 'Job Giver' : 'Installer'} has proposed a new date: ${new Date(proposedDate).toDateString()}. Please log in to Accept or Reject.`
                    );
                }
            }

            return NextResponse.json({ success: true, message: 'Reschedule proposed successfully.' });

        } else if (action === 'accept') {
            if (!job.dateChangeProposal || job.dateChangeProposal.status !== 'pending') {
                return NextResponse.json({ error: 'No pending proposal found.' }, { status: 400 });
            }

            // Verify Acceptor is NOT the Proposer
            if ((job.dateChangeProposal.proposedBy === 'Job Giver' && isJobGiver) ||
                (job.dateChangeProposal.proposedBy === 'Installer' && isInstaller)) {
                return NextResponse.json({ error: 'You cannot accept your own proposal.' }, { status: 400 });
            }

            const newDate = (job.dateChangeProposal.newDate as any).toDate ? (job.dateChangeProposal.newDate as any).toDate() : new Date(job.dateChangeProposal.newDate as any);

            await jobRef.update({
                jobStartDate: newDate,
                'dateChangeProposal.status': 'accepted',
                // Clear any previous "NO SHOW" flags or alerts if they existed? Not needed unless we logged them.
            });

            await logAdminAlert('INFO', `Job ${jobId} Rescheduled to ${newDate.toDateString()}`, { jobId, newDate });

            // Notify Proposer
            // If proposer was Job Giver, and I am Installer (accepting), notify Job Giver.
            const proposerRole = job.dateChangeProposal.proposedBy;
            const recipientId = proposerRole === 'Job Giver'
                ? (typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id)
                : (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id);

            if (recipientId) {
                const rSnap = await db.collection('users').doc(recipientId).get();
                const rEmail = rSnap.data()?.email;
                if (rEmail) {
                    await sendServerEmail(rEmail, `Reschedule Accepted: ${job.title}`, `The new date is confirmed: ${newDate.toDateString()}.`);
                }
            }

            return NextResponse.json({ success: true, message: 'Reschedule accepted. Job date updated.' });

        } else if (action === 'reject') {
            if (!job.dateChangeProposal || job.dateChangeProposal.status !== 'pending') {
                return NextResponse.json({ error: 'No pending proposal found.' }, { status: 400 });
            }

            await jobRef.update({
                'dateChangeProposal.status': 'rejected'
            });

            // Notify Proposer
            const pRole = job.dateChangeProposal.proposedBy;
            const rId = pRole === 'Job Giver'
                ? (typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id)
                : (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id);

            if (rId) {
                const rSnap = await db.collection('users').doc(rId).get();
                const rEmail = rSnap.data()?.email;
                if (rEmail) {
                    await sendServerEmail(rEmail, `Reschedule Rejected: ${job.title}`, `Your proposal was rejected. Please contact the counterparty via Chat.`);
                }
            }

            return NextResponse.json({ success: true, message: 'Reschedule proposal rejected.' });

        } else if (action === 'dismiss') {
            await jobRef.update({
                dateChangeProposal: FieldValue.delete()
            });
            return NextResponse.json({ success: true, message: 'Reschedule proposal dismissed.' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Reschedule API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
