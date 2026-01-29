'use server';

import { jobService } from '@/domains/jobs/job.service';
import { userService } from '@/domains/users/user.service';
import { CreateJobInput } from '@/domains/jobs/job.types';
import { startWorkSchema } from '@/lib/validations/jobs';
import { logger } from '@/infrastructure/logger';
import { Role, Job } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/infrastructure/firebase/admin';

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
        console.log(`[Action] createJobAction called by ${userId} (${userRole})`);

        // Delegate business logic to the domain service
        const jobId = await jobService.createJob(userId, userRole, data);

        // Revalidate the jobs dashboard to show the new job immediately
        revalidatePath('/dashboard/jobs');
        revalidatePath('/dashboard/posted-jobs');

        return { success: true, jobId };
    } catch (error: any) {
        console.error('[Action] createJobAction failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to create job',
        };
    }
}

/**
 * Server Action to get job details for editing
 */
export async function getJobForEditAction(jobId: string, userId: string): Promise<{ success: boolean; job?: any; error?: string }> {
    try {
        const job = await jobService.getJobById(jobId, userId);

        // Serialize dates for client
        const serializedJob = JSON.parse(JSON.stringify(job));
        return { success: true, job: serializedJob };
    } catch (error: any) {
        console.error('[Action] getJobForEditAction failed:', error);
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
        // Map CreateJobInput back to Job partial
        // Note: In a real app, we might want a specific UpdateJobInput type
        const updates: any = { ...data };

        await jobService.updateJob(jobId, userId, updates);

        revalidatePath(`/dashboard/jobs/${jobId}`);
        revalidatePath('/dashboard/jobs');

        return { success: true };
    } catch (error: any) {
        console.error('[Action] updateJobAction failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to update job',
        };
    }
}

/**
 * Server Action to award a job to an installer (Job Giver)
 */
export async function awardJobAction(jobId: string, userId: string, installerId: string, acceptanceDeadline: string): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.awardJob(jobId, userId, installerId, new Date(acceptanceDeadline));
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[Action] awardJobAction failed:', error);
        return { success: false, error: error.message || 'Failed to award job' };
    }
}

/**
 * Server Action to approve a job (Job Giver)
 */
export async function approveJobAction(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.approveJob(jobId, userId);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[Action] approveJobAction failed:', error);
        return { success: false, error: error.message || 'Failed to approve job' };
    }
}

/**
 * Server Action to accept a job assignment (Installer)
 */
export async function acceptJobAction(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.acceptJobAssignment(jobId, userId);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        revalidatePath('/dashboard/jobs');
        return { success: true };
    } catch (error: any) {
        console.error('[Action] acceptJobAction failed:', error);
        return { success: false, error: error.message || 'Failed to accept job' };
    }
}

/**
 * Server Action to complete a job with OTP (Installer)
 */
export async function completeJobWithOtpAction(
    jobId: string,
    userId: string,
    otp: string,
    attachments: any[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await jobService.completeJobWithOtp(jobId, userId, otp, attachments);
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[Action] completeJobWithOtpAction failed:', error);
        return { success: false, error: error.message || 'Failed to complete job' };
    }
}

// function verifyInstallerAction disabled to fix 500 error
// export async function verifyInstallerAction(installerId: string): Promise<{ success: boolean; installer?: any }> {
// return { success: false };
// }


export async function getInvoiceDataAction(jobId: string, userId: string, type?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const db = getAdminDb();
        const jobDoc = await db.collection('jobs').doc(jobId).get();

        if (!jobDoc.exists) {
            return { success: false, error: 'Job not found' };
        }

        const jobData = jobDoc.data() as Job;

        // 2. Fetch Transaction (if it exists)
        let transaction = null;
        if (jobData.status === 'completed' || jobData.status === 'Completed' || jobData.status === 'Pending Funding' || jobData.status === 'funded' || jobData.status === 'In Progress') {
            const txSnapshot = await db.collection('transactions')
                .where('jobId', '==', jobId)
                .limit(1)
                .get();

            if (!txSnapshot.empty) {
                transaction = txSnapshot.docs[0].data();
            }
        }

        // Expand Job Giver and Installer for Invoice Page
        let expandedJob = { ...jobData };

        if (jobData.jobGiverId) {
            const giverSnap = await db.collection('users').doc(jobData.jobGiverId).get();
            if (giverSnap.exists) {
                expandedJob.jobGiver = { id: giverSnap.id, ...giverSnap.data() } as any;
            }
        }

        if (jobData.awardedInstallerId) {
            const installerSnap = await db.collection('users').doc(jobData.awardedInstallerId).get();
            if (installerSnap.exists) {
                expandedJob.awardedInstaller = { id: installerSnap.id, ...installerSnap.data() } as any;
            }
        }

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                job: expandedJob,
                transaction
            }))
        };
    } catch (error: any) {
        console.error('Error in getInvoiceDataAction:', error);
        return { success: false, error: error.message };
    }
}

export async function listJobsForJobGiverAction(userId: string): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
        const jobs = await jobService.listJobsForJobGiver(userId);
        return { success: true, data: JSON.parse(JSON.stringify(jobs)) };
    } catch (error: any) {
        return { success: false, data: [], error: error.message || 'Failed to list jobs' };
    }
}

export async function listOpenJobsAction(filters?: any): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
        const jobs = await jobService.listOpenJobs(filters);
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
