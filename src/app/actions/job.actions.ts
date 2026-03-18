'use server';

import { jobService } from '@/domains/jobs/job.service';
import { userService } from '@/domains/users/user.service';
import { CreateJobInput, JobFilters } from '@/domains/jobs/job.types';
import { startWorkSchema } from '@/lib/validations/jobs';

import { Role, Job, JobAttachment, Transaction, User, DisputeAttachment, Dispute } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { logger } from '@/lib/system-logger';
import { emailService } from '@/lib/email/email-service';
import { FieldValue } from 'firebase-admin/firestore';
import { invoiceService } from '@/domains/jobs/invoice.service';
import { AdminGuard } from '@/lib/auth/admin-guard';

/**
 * Server Action to create a new job
 * Bridges the client-side form to the domain service
 */
export async function createJobAction(
    data: CreateJobInput,
    userId: string,
    userRole: Role
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
        // Delegate business logic to the domain service
        const jobId = await jobService.createJob(userId, userRole, data);

        // Revalidate the jobs dashboard to show the new job immediately
        revalidatePath('/dashboard/jobs');
        revalidatePath('/dashboard/posted-jobs');

        return { success: true, jobId };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to create job',
        };
    }
}

/**
 * Server Action to get job details for editing
 */
export async function getJobForEditAction(jobId: string, userId: string): Promise<{ success: boolean; job?: Job; error?: string }> {
    try {
        const job = await jobService.getJobById(jobId, userId);

        // Serialize dates for client
        const serializedJob = JSON.parse(JSON.stringify(job));
        return { success: true, job: serializedJob };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to fetch job',
        };
    }
}

import { moderateMessageFlow } from '@/ai/flows/moderate-message';

/**
 * Server Action to update a job
 */
export async function updateJobAction(jobId: string, userId: string, data: Partial<Job>): Promise<{ success: boolean; error?: string }> {
    try {
        // Map CreateJobInput back to Job partial
        // Note: In a real app, we might want a specific UpdateJobInput type
        const updates: Partial<Job> = { ...data };

        // --- Chat Moderation (Revenue Protection) ---
        // If a new private message is being added, moderate it.
        if (updates.privateMessages && updates.privateMessages.length > 0) {
            // Assuming the last message in the array is the new one
            // (Logic depends on how client appends. Usually client sends full array? Or just the new one?)
            // Based on `job-detail-client.tsx`, it seems to handle `handleJobUpdate` by merging.
            // But usually for chats, we might be appending.
            // Let's assume the client sends the *updated full array* or we need to check the diff.
            // Actually, `handleJobUpdate` in client sends: `privateMessages: [...(job.privateMessages||[]), newMessage]`.
            // So we should check the *last* message.
            const lastMsg = updates.privateMessages[updates.privateMessages.length - 1];

            // Only moderate if it's from the current user (security check)
            // AND it's a new message (we don't want to re-moderate old ones if we pass the whole array)
            // Simpler: Just moderate the last text content if it exists.
            if (lastMsg && lastMsg.content) {
                const moderation = await moderateMessageFlow({
                    message: lastMsg.content,
                    userId: userId,
                    limitType: 'ai_chat'
                });

                if (moderation.isFlagged) {
                    // Reject the update
                    return {
                        success: false,
                        error: moderation.reason || "Message blocked by safety filters."
                    };
                }
            }
        }

        await jobService.updateJob(jobId, userId, updates);

        revalidatePath(`/dashboard/jobs/${jobId}`);
        revalidatePath('/dashboard/jobs');

        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to update job',
        };
    }
}

/**
 * Server Action to award a job to an Professional (Client)
 */
export async function awardJobAction(jobId: string, userId: string, professionalId: string, acceptanceDeadline: string): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.awardJob(jobId, userId, professionalId, new Date(acceptanceDeadline));

        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to award job' };
    }
}

/**
 * Server Action to approve a job (Client)
 */
export async function approveJobAction(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.approveJob(jobId, userId);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to approve job' };
    }
}

/**
 * Server Action to accept a job assignment (Professional)
 */
export async function acceptJobAction(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.acceptJobAssignment(jobId, userId);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        revalidatePath('/dashboard/jobs');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to accept job' };
    }
}

/**
 * Server Action to complete a job with OTP (Professional)
 */
export async function completeJobWithOtpAction(
    jobId: string,
    userId: string,
    otp: string,
    attachments: JobAttachment[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.completeJobWithOtp(jobId, userId, otp, attachments);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to complete job' };
    }
}



type InvoiceData = {
    job: Job & { client?: User; awardedProfessional?: User };
    transaction: Transaction | null;
};

export async function getInvoiceDataAction(jobId: string, userId: string, type?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const data = await invoiceService.getInvoiceData(jobId);

        // Security check: Only parties or staff can see invoice data
        const isStaff = await AdminGuard.isStaff(userId);
        const isParty = data.job.clientId === userId || data.job.awardedProfessionalId === userId;

        if (!isStaff && !isParty) {
            throw new Error('Unauthorized access to invoice data');
        }

        return {
            success: true,
            data: JSON.parse(JSON.stringify(data))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function listJobsForClientAction(userId: string, limit = 50, lastPostedAt?: string): Promise<{ success: boolean; data: Job[]; error?: string }> {
    try {
        const jobs = await jobService.listJobsForClient(userId, limit, lastPostedAt ? new Date(lastPostedAt) : undefined);
        return { success: true, data: JSON.parse(JSON.stringify(jobs)) };
    } catch (error: any) {
        return { success: false, data: [], error: error.message || 'Failed to list jobs' };
    }
}

export async function listOpenJobsAction(filters?: JobFilters, limit = 50, lastPostedAt?: string): Promise<{ success: boolean; data: Job[]; error?: string }> {
    try {
        const jobs = await jobService.listOpenJobs(filters, limit, lastPostedAt ? new Date(lastPostedAt) : undefined);
        return { success: true, data: JSON.parse(JSON.stringify(jobs)) };
    } catch (error: any) {
        return { success: false, data: [], error: error.message || 'Failed to list open jobs' };
    }
}

export async function startWorkAction(jobId: string, userId: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.startWork(jobId, userId, otp);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to start work' };
    }
}

export async function rescheduleJobAction(
    jobId: string,
    userId: string,
    action: 'propose' | 'accept' | 'reject' | 'dismiss',
    proposedDate?: string
) {
    try {
        await jobService.rescheduleJob(jobId, userId, action, proposedDate ? new Date(proposedDate) : undefined);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function promoteJobAction(
    jobId: string,
    userId: string,
    travelTip: number,
    deadline: string
) {
    try {
        await jobService.promoteJob(jobId, userId, travelTip, new Date(deadline));
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function batchJobAction(userId: string, jobIds: string[], action: 'archive' | 'delete') {
    try {
        await jobService.batchAction(userId, jobIds, action);
        revalidatePath('/dashboard/posted-jobs');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function raiseDisputeAction(
    jobId: string,
    userId: string,
    reason: string,
    description: string,
    category: "Job Dispute" | "Billing Inquiry" | "Technical Support" | "Skill Request" | "General Question" = "Job Dispute",
    attachments: { fileName: string; fileUrl: string; fileType: string; }[] = []
): Promise<{ success: boolean; error?: string }> {
    try {
        // Direct DB Access or via Service. Using Service pattern for consistency.
        // Assuming jobService has (or will have) raiseDispute.
        // For now, let's implement the logic here using adminDb if service is missing, 
        // OR better: use updateJobAction logic as base.

        const db = getAdminDb();
        const jobRef = db.collection('jobs').doc(jobId);

        // 1. Check Job
        const doc = await jobRef.get();
        if (!doc.exists) throw new Error("Job not found");
        const job = doc.data() as Job;

        // 2. Validate Actor
        if (job.clientId !== userId && job.awardedProfessionalId !== userId) {
            throw new Error("Unauthorized to dispute this job");
        }

        // 3. Create Dispute Record
        const disputeRef = db.collection('disputes').doc();
        await disputeRef.set({
            id: disputeRef.id,
            jobId,
            jobTitle: job.title,
            requesterId: userId,
            category,
            reason,
            title: `Dispute: ${reason}`,
            description,
            status: 'Open',
            createdAt: new Date(),
            parties: {
                clientId: job.clientId,
                professionalId: job.awardedProfessionalId
            },
            messages: [{
                authorId: userId,
                authorRole: job.clientId === userId ? 'Client' : 'Professional',
                content: description,
                attachments: attachments,
                timestamp: new Date()
            }]
        });

        // 3.5. Update Transaction Status if exists
        const transQuery = await db.collection('transactions').where("jobId", "==", jobId).limit(1).get();
        if (!transQuery.empty) {
            const transDoc = transQuery.docs[0];
            const transData = transDoc.data();
            if (transData.status === 'funded') {
                await transDoc.ref.update({ status: 'disputed' });
            }
        }

        // 4. Update Job Status
        await jobRef.update({
            status: 'disputed', // or 'Disputed'
            disputeId: disputeRef.id
        });

        // 5. Send Notifications
        const otherPartyId = job.clientId === userId ? job.awardedProfessionalId : job.clientId;
        if (otherPartyId) {
            const otherPartySnap = await db.collection('users').doc(otherPartyId).get();
            const requesterSnap = await db.collection('users').doc(userId).get();

            if (otherPartySnap.exists && requesterSnap.exists) {
                const otherParty = otherPartySnap.data() as User;
                const requester = requesterSnap.data() as User;
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dodo-test.web.app';

                // To the other party
                await emailService.sendDisputeRaisedEmail({
                    to: otherParty.email,
                    userName: otherParty.name,
                    jobTitle: job.title,
                    reason,
                    disputeLink: `${baseUrl}/dashboard/disputes/${disputeRef.id}`
                });

                // To the requester (Optional acknowledgement)
                await emailService.sendDisputeRaisedEmail({
                    to: requester.email,
                    userName: requester.name,
                    jobTitle: job.title,
                    reason,
                    disputeLink: `${baseUrl}/dashboard/disputes/${disputeRef.id}`
                });
            }
        }

        revalidatePath(`/dashboard/jobs/${jobId}`);
        revalidatePath(`/dashboard/disputes/${disputeRef.id}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action to securely reveal contact details
 */
export async function revealContactAction(jobId: string, userId: string): Promise<{ success: boolean; contact?: Partial<User>; error?: string }> {
    try {
        const contact = await jobService.getCounterParty(jobId, userId);
        return { success: true, contact: contact || undefined };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to reveal contact' };
    }
}
export async function sendMessageAction(
    jobId: string,
    senderId: string,
    content: string,
    attachments: { fileName: string; fileUrl: string; fileType: string; }[] = []
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const jobRef = db.collection('jobs').doc(jobId);
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) throw new Error("Job not found");
        const job = jobDoc.data() as Job;

        // 1. Save to Firestore
        const isclient = job.clientId === senderId;
        const msgType = isclient ? 'job_giver_message' : 'Professional_message';

        const commRef = await db.collection(`jobs/${jobId}/communications`).add({
            jobId,
            type: msgType,
            content: content.trim(),
            author: senderId,
            authorName: isclient ? 'Client' : 'Professional', // Fallback or fetch from user
            timestamp: FieldValue.serverTimestamp(),
            read: false,
            attachments
        });

        // 2. Notify recipient via email
        const recipientId = isclient ? job.awardedProfessionalId : job.clientId;
        if (recipientId) {
            const [recipientSnap, senderSnap] = await Promise.all([
                db.collection('users').doc(recipientId).get(),
                db.collection('users').doc(senderId).get()
            ]);

            if (recipientSnap.exists && senderSnap.exists) {
                const recipient = recipientSnap.data() as User;
                const sender = senderSnap.data() as User;
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dodo-test.web.app';

                await emailService.sendNewMessageEmail({
                    to: recipient.email,
                    userName: recipient.name,
                    senderName: sender.name,
                    jobTitle: job.title,
                    messagePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                    chatLink: `${baseUrl}/dashboard/jobs/${jobId}?tab=communications`
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function postDisputeMessageAction(
    disputeId: string,
    authorId: string,
    content: string,
    authorRole: Role,
    attachments: { fileName: string; fileUrl: string; fileType: string; }[] = []
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const disputeRef = db.collection('disputes').doc(disputeId);
        const disputeSnap = await disputeRef.get();
        if (!disputeSnap.exists) throw new Error("Dispute not found");
        const dispute = disputeSnap.data() as Dispute;

        // Security Check
        const isStaff = await AdminGuard.isStaff(authorId);
        const isParty = dispute.parties?.clientId === authorId || dispute.parties?.professionalId === authorId;

        if (!isStaff && !isParty) {
            throw new Error("Unauthorized to post in this dispute");
        }

        const message = {
            authorId,
            authorRole,
            content,
            timestamp: FieldValue.serverTimestamp(),
            attachments
        };

        await disputeRef.update({
            messages: FieldValue.arrayUnion(message)
        });

        // Notify other parties
        const parties = dispute.parties;
        if (parties) {
            const recipientIds = [parties.clientId, parties.professionalId].filter(id => id !== authorId);

            for (const recipientId of recipientIds) {
                const recipientSnap = await db.collection('users').doc(recipientId).get();
                if (recipientSnap.exists) {
                    const recipient = recipientSnap.data() as User;
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dodo-test.web.app';

                    await emailService.sendNewMessageEmail({
                        to: recipient.email,
                        userName: recipient.name,
                        senderName: (authorRole as any) === 'Support Team' || (authorRole as any) === 'Admin' ? 'Support Team' : (authorRole === 'Client' ? 'Client' : 'Professional'),
                        jobTitle: dispute.jobTitle || 'Your Job',
                        messagePreview: content.substring(0, 100),
                        chatLink: `${baseUrl}/dashboard/disputes/${disputeId}`
                    });
                }
            }
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateDisputeStatusAction(
    disputeId: string,
    adminId: string,
    newStatus: 'Open' | 'Under Review' | 'Resolved',
    resolution?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await AdminGuard.requireStaff(adminId);
        const db = getAdminDb();
        const disputeRef = db.collection('disputes').doc(disputeId);
        const disputeSnap = await disputeRef.get();
        if (!disputeSnap.exists) throw new Error("Dispute not found");
        const dispute = disputeSnap.data() as Dispute;

        const updateData: any = { status: newStatus };
        if (newStatus === 'Resolved') {
            updateData.resolvedAt = FieldValue.serverTimestamp();
            if (resolution) updateData.resolution = resolution;
        }
        if (newStatus === 'Under Review' && !dispute.handledBy) {
            updateData.handledBy = adminId;
        }

        await disputeRef.update(updateData);

        // Notify parties
        if (dispute.parties) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dodo-test.web.app';
            const partyIds = [dispute.parties.clientId, dispute.parties.professionalId];

            for (const pid of partyIds) {
                const pSnap = await db.collection('users').doc(pid).get();
                if (pSnap.exists) {
                    const pUser = pSnap.data() as User;
                    await emailService.sendDisputeUpdateEmail({
                        to: pUser.email,
                        userName: pUser.name,
                        jobTitle: dispute.jobTitle || 'Your Job',
                        status: newStatus,
                        disputeLink: `${baseUrl}/dashboard/disputes/${disputeId}`
                    });
                }
            }
        }

        revalidatePath(`/dashboard/disputes/${disputeId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}



