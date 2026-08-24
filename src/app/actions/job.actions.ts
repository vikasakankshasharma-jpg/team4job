'use server';
import { jobRepository } from "@/domains/jobs/job.repository";

import { jobService } from '@/domains/jobs/job.service';
import { userService } from '@/domains/users/user.service';
import { disputeService } from '@/domains/disputes/dispute.service';
import { CreateJobInput, JobFilters } from '@/domains/jobs/job.types';
import { startWorkSchema } from '@/lib/validations/jobs';

import { Role, Job, JobAttachment, User, Transaction } from '@/lib/types';
import { revalidatePath, unstable_cache } from 'next/cache';
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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


/**
 * Server Action to update a job
 */
export async function updateJobAction(jobId: string, userId: string, data: Partial<Job>): Promise<{ success: boolean; error?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        // Map CreateJobInput back to Job partial
        // Note: In a real app, we might want a specific UpdateJobInput type
        const updates: Partial<Job> = { ...data };

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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        await jobService.awardJob(jobId, userId, professionalId, new Date(acceptanceDeadline));

        revalidatePath(`/dashboard/jobs/${jobId}`);
        revalidatePath('/dashboard/jobs');
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        await jobService.completeJobWithOtp(jobId, userId, otp, attachments);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to complete job' };
    }
}

/**
 * Server Action to submit work for review (Professional)
 */
export async function submitWorkAction(
    jobId: string,
    userId: string,
    attachments: JobAttachment[]
): Promise<{ success: boolean; error?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        await jobService.submitWork(jobId, userId, attachments);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        revalidatePath('/dashboard/jobs');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to submit work' };
    }
}



type InvoiceData = {
    job: Job & { client?: User; awardedProfessional?: User };
    transaction: Transaction | null;
};

export async function getInvoiceDataAction(jobId: string, userId: string, type?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        // Add timeout to prevent SSR hangs
        const jobs = await Promise.race([
            jobService.listJobsForClient(userId, limit, lastPostedAt ? new Date(lastPostedAt) : undefined),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('List jobs timeout')), 10000))
        ]);
        return { success: true, data: JSON.parse(JSON.stringify(jobs)) };
    } catch (error: any) {
        console.error(`[JobAction] Error listing jobs: ${error.message}`);
        return { success: false, data: [], error: error.message || 'Failed to list jobs' };
    }
}

export async function listOpenJobsAction(filters?: JobFilters, limit = 50, lastPostedAt?: string): Promise<{ success: boolean; data: Job[]; error?: string }> {
    try {
        const fetchJobs = unstable_cache(
            async (f?: JobFilters, l?: number, d?: Date) => jobService.listOpenJobs(f, l, d),
            ['open-jobs', JSON.stringify(filters || {}), limit.toString(), lastPostedAt || ''],
            { revalidate: 60, tags: ['open-jobs'] }
        );

        // Add timeout to prevent SSR hangs
        const jobs = await Promise.race([
            fetchJobs(filters, limit, lastPostedAt ? new Date(lastPostedAt) : undefined),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('List open jobs timeout')), 10000))
        ]);
        return { success: true, data: JSON.parse(JSON.stringify(jobs)) };
    } catch (error: any) {
        console.error(`[JobAction] Error listing open jobs: ${error.message}`);
        return { success: false, data: [], error: error.message || 'Failed to list open jobs' };
    }
}

export async function startWorkAction(jobId: string, userId: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        await jobService.promoteJob(jobId, userId, travelTip, new Date(deadline));
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function batchJobAction(userId: string, jobIds: string[], action: 'archive' | 'delete') {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
): Promise<{ success: boolean; error?: string; disputeId?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
        const disputeId = await jobService.raiseDispute(jobId, userId, reason, description, category, attachments);
        return { success: true, disputeId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action to securely reveal contact details
 */
export async function revealContactAction(jobId: string, userId: string): Promise<{ success: boolean; contact?: Partial<User>; error?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(userId);
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
    attachments: { fileName: string; fileUrl: string; fileType: string; }[] = [],
    targetRecipientId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(senderId);
        await jobService.sendCommunication(jobId, senderId, content, attachments, targetRecipientId);
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
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(authorId);
        await disputeService.respondToDispute(disputeId, authorId, content, authorRole, attachments);
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
    const { requireStaffSession } = await import('@/lib/auth-server');
    await requireStaffSession();
        await AdminGuard.requireStaff(adminId);
        await disputeService.updateDisputeStatus(disputeId, adminId, newStatus, resolution);
        revalidatePath(`/dashboard/disputes/${disputeId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}



export async function addJobCommentAction(jobId: string, authorId: string, content: string) {
    try {
    const { requireAuth } = await import('@/lib/auth-server');
    await requireAuth(authorId);
        await jobService.addJobComment(jobId, authorId, content);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function updateJobLocationAction(jobId: string, lat: number, lng: number) {
    try {
        await jobRepository.update(jobId, {
            installerLocation: {
                lat,
                lng,
                updatedAt: new Date().toISOString()
            }
        } as any);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function listDealerJobsAction(userId: string, limit = 50): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
        const { requireAuth } = await import('@/lib/auth-server');
        await requireAuth(userId);
        const { jobService } = await import('@/domains/jobs/job.service');
        const jobs = await Promise.race([
            jobService.listDealerJobs(userId, limit),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('List dealer jobs timeout')), 10000))
        ]);
        return { success: true, data: JSON.parse(JSON.stringify(jobs)) };
    } catch (error: any) {
        return { success: false, data: [], error: error.message || 'Failed to list dealer jobs' };
    }
}
export interface ServiceHistoryItem {
    jobId: string;
    title: string;
    category: string;
    status: string;
    date: string;
    installerName?: string;
}

export async function getJobServiceHistoryAction(jobId: string): Promise<{ success: boolean; data: ServiceHistoryItem[]; error?: string }> {
    try {
        const { requireAuth } = await import('@/lib/auth-server');
        const { uid: userId } = await requireAuth(); // We don't trust client provided user ID here

        const { jobRepository } = await import('@/domains/jobs/job.repository');
        const { userRepository } = await import('@/domains/users/user.repository');
        
        const currentJob = await jobRepository.fetchById(jobId);
        if (!currentJob) throw new Error('Job not found');

        // Security check: Must be a participant
        const isAuthorized = 
            userId === currentJob.clientId ||
            userId === currentJob.dealerId ||
            userId === currentJob.endCustomerId ||
            userId === currentJob.awardedProfessionalId;
            // Admin/support authorization could be added here if needed

        if (!isAuthorized) {
            throw new Error('Not authorized to view service history for this location');
        }

        if (!currentJob.serviceLocationId) {
            return { success: true, data: [] }; // Legacy job without history
        }

        const historicalJobs = await jobRepository.getServiceHistory(currentJob.serviceLocationId, currentJob.id);

        const historyItems: ServiceHistoryItem[] = await Promise.all(historicalJobs.map(async (job) => {
            let installerName = undefined;
            // Only expose previous installer name to the Dealer, the Admin, or the current Installer
            const canSeeInstaller = userId === currentJob.dealerId || userId === currentJob.awardedProfessionalId;
            if (job.awardedProfessionalId && canSeeInstaller) {
                try {
                    const pro = await userRepository.fetchById(job.awardedProfessionalId);
                    installerName = pro?.name || undefined;
                } catch(e) {
                    // Ignore fetching errors
                }
            }

            return {
                jobId: job.id,
                title: job.title || 'Service Job',
                category: job.jobCategory || 'General',
                status: job.status,
                date: (job.postedAt as any)?._seconds 
                    ? new Date((job.postedAt as any)._seconds * 1000).toISOString() 
                    : new Date().toISOString(),
                installerName
            };
        }));

        return { success: true, data: historyItems };

    } catch (error: any) {
        console.error('[JobAction] Error fetching service history:', error);
        return { success: false, data: [], error: error.message || 'Failed to fetch history' };
    }
}
