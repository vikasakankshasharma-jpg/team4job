// domains/jobs/job.service.ts

import { jobRepository } from './job.repository';
import { jobRules } from './job.rules';
import { Job, JobStatus, CreateJobInput, JobFilters, JobStats, InstallerStats } from './job.types'; // Updated imports
import { logger } from '@/infrastructure/logger';
import { Role } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import { paymentService } from '../payments/payment.service';
import { Timestamp } from 'firebase-admin/firestore';
import { aiLearningService } from '@/ai/services/ai-learning.service';

/**
 * Job Service - Business logic for job management
 * Orchestrates repository calls and enforces business rules
 */
export class JobService {
    /**
     * Create a new job
     */
    async createJob(userId: string, userRole: Role, data: CreateJobInput): Promise<string> {
        // Validate user can create job
        if (!jobRules.canCreateJob(userRole)) {
            throw new Error('Only Job Givers can create jobs');
        }

        // Validate job data
        const validation = jobRules.validateJobData(data);
        if (!validation.valid) {
            throw new Error(`Invalid job data: ${validation.errors.join(', ')}`);
        }

        try {
            // Prepare job document
            const job: Partial<Job> = {
                ...data,
                jobGiverId: userId,
                status: 'open',
                bids: [],
                comments: [],
                bidderIds: [],
                statusHistory: [],
            };

            const jobId = await jobRepository.create(job);

            logger.userActivity(userId, 'job_created', { jobId, title: data.title });

            // AI Learning Linkage (Async, don't block)
            aiLearningService.linkLogToEntity(userId, jobId, 'price_estimate').catch(err => console.error(err));
            aiLearningService.linkLogToEntity(userId, jobId, 'time_estimate').catch(err => console.error(err));

            return jobId;
        } catch (error: any) {
            logger.error('Failed to create job', error, { userId });
            throw new Error(error.message || 'Failed to create job');
        }
    }

    /**
     * Post a job (make it public/open for bidding)
     */
    async postJob(jobId: string, userId: string, userRole: Role): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Verify ownership
        if (userRole !== 'Admin' && job.jobGiverId !== userId) {
            throw new Error('Not authorized to post this job');
        }

        // Verify state transition
        if (!jobRules.canTransitionTo(job.status, 'open')) {
            throw new Error(`Cannot transition from ${job.status} to open`);
        }

        await jobRepository.updateStatus(jobId, 'Open for Bidding', userId, 'Job posted publicly');
        logger.userActivity(userId, 'job_posted', { jobId, title: job.title });
    }

    /**
     * Get jobs for job giver dashboard
     */
    async listJobsForJobGiver(userId: string, limit = 50, lastPostedAt?: Date): Promise<Job[]> {
        try {
            return await jobRepository.fetchByJobGiver(userId, limit);
        } catch (error) {
            logger.error('Failed to list jobs for job giver', error, { userId });
            throw error;
        }
    }

    /**
     * Get bids placed by a specific installer across all jobs
     */
    async getBidsByInstaller(userId: string): Promise<any[]> {
        const jobs = await jobRepository.fetchByInstaller(userId);
        const userBids: any[] = [];

        jobs.forEach(job => {
            const bids = (job as any).bids || [];
            bids.forEach((bid: any) => {
                const installerId = typeof bid.installer === 'string'
                    ? bid.installer
                    : bid.installer?.id || bid.installerId;

                if (installerId === userId) {
                    userBids.push({
                        ...bid,
                        jobId: job.id,
                        jobTitle: job.title,
                        jobStatus: job.status,
                        jobGiverId: job.jobGiverId,
                        job: job
                    });
                }
            });
        });

        return userBids;
    }

    /**
     * Get open jobs for browsing (installer view)
     */
    async listOpenJobs(filters?: JobFilters, limit = 50, lastPostedAt?: Date): Promise<Job[]> {
        try {
            return await jobRepository.fetchOpen(filters, limit, lastPostedAt);
        } catch (error) {
            logger.error('Failed to list open jobs', error);
            throw error;
        }
    }

    /**
     * Get jobs for installer (bids + awarded jobs)
     */
    async listJobsForInstaller(installerId: string): Promise<Job[]> {
        try {
            return await jobRepository.fetchByInstaller(installerId);
        } catch (error) {
            logger.error('Failed to list jobs for installer', error, { userId: installerId });
            throw error;
        }
    }

    /**
     * Get single job details
     */
    async getJobById(jobId: string, userId: string): Promise<Job> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // TODO: Check visibility permissions
        // Public if status is 'open'
        // Otherwise only visible to jobGiver, awardedInstaller, and admins

        return job;
    }

    /**
     * Update job details (generic update)
     */
    async updateJob(jobId: string, userId: string, updates: Partial<Job>): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        const ownerId = job.jobGiverId || (typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver?.id);
        const isOwner = ownerId === userId;
        // Use awardedInstallerId specific field first
        const awardedId = job.awardedInstallerId || (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id);
        const isAwarded = awardedId === userId;

        if (!isOwner && !isAwarded) {
            throw new Error('Unauthorized update attempt');
        }

        await jobRepository.update(jobId, updates);
        logger.info(`Job ${jobId} updated by ${userId}`, { updates });
    }

    /**
     * Award a job to an installer
     */
    async awardJob(jobId: string, userId: string, installerId: string, acceptanceDeadline: Date): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        const ownerId = job.jobGiverId || (typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver?.id);
        if (ownerId !== userId) throw new Error('Unauthorized: Only job owner can award job');

        if (job.status !== 'open' && job.status !== 'Open for Bidding') {
            throw new Error(`Job is not available for awarding (Status: ${job.status})`);
        }

        if (!installerId) {
            throw new Error('Installer ID is required to award job');
        }

        const updates: Partial<Job> = {
            status: 'bid_accepted',
            awardedInstallerId: installerId,
            acceptanceDeadline: acceptanceDeadline,
        };

        console.log(`[JobService.awardJob] Awarding job ${jobId} to ${installerId}. Updates:`, JSON.stringify(updates));

        await jobRepository.update(jobId, updates);
        logger.info(`Job ${jobId} awarded to ${installerId} by ${userId}`);
    }

    /**
     * Get bids for a specific job
     */
    async getBidsForJob(jobId: string, userId: string): Promise<any[]> { // Using any[] for now, should be Bid[]
        const job = await this.getJobById(jobId, userId);

        // Filter bids based on visibility rules
        // Job Giver sees all bids
        // Admin sees all bids
        // Installer sees only their own bid? Or open bidding platform?
        // Assuming open bidding for now or restricted visibility

        return job.bids || [];
    }

    /**
     * Accept a bid
     */
    async acceptBid(jobId: string, bidId: string, userId: string, userRole: Role
    ): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Validate permissions
        if (!jobRules.canAcceptBid(job.status, userId, job.jobGiverId, userRole)) {
            throw new Error('Cannot accept bid - check job status and permissions');
        }

        // Find the bid
        const bid = job.bids.find(b => b.id === bidId);
        if (!bid) {
            throw new Error('Bid not found');
        }

        // Extract installer ID
        const installerId = typeof bid.installer === 'string'
            ? bid.installer
            : (bid.installer as any).id || bid.installerId;

        // Update job
        await jobRepository.update(jobId, {
            awardedInstallerId: installerId,
            awardedInstaller: bid.installer,
        });

        await jobRepository.updateStatus(
            jobId,
            'Awarded',
            userId,
            `Accepted bid from ${installerId}`
        );

        logger.userActivity(userId, 'bid_accepted', { jobId, bidId, installerId });
    }

    /**
     * Accept a job assignment (Installer accepts the award)
     */
    async acceptJobAssignment(jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.status !== 'bid_accepted' && job.status !== 'Awarded') {
            throw new Error(`Job is not available for acceptance (Status: ${job.status})`);
        }

        const awardedId = job.awardedInstallerId || (
            typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id
        );

        if (awardedId !== userId) {
            throw new Error(`Not authorized to accept this job (Awarded: ${awardedId}, You: ${userId})`);
        }

        const fundingDeadline = new Date();
        fundingDeadline.setHours(fundingDeadline.getHours() + 48);

        await jobRepository.update(jobId, {
            fundingDeadline: fundingDeadline,
            acceptanceDeadline: FieldValue.delete() as any,
        });

        await jobRepository.updateStatus(
            jobId,
            'Pending Funding',
            userId,
            'Installer accepted job'
        );

        logger.userActivity(userId, 'job_accepted', { jobId });
    }

    /**
     * Fund a job (transition from bid_accepted to funded)
     */
    async fundJob(jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.jobGiverId !== userId) {
            throw new Error('Not authorized');
        }

        if (!jobRules.canTransitionTo(job.status, 'funded')) {
            throw new Error(`Cannot fund job in ${job.status} status`);
        }

        const startOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const completionOtp = Math.floor(100000 + Math.random() * 900000).toString();

        await jobRepository.update(jobId, {
            startOtp,
            completionOtp
        });

        await jobRepository.updateStatus(jobId, 'Pending Funding', userId, 'Job funded');
        logger.userActivity(userId, 'job_funded', { jobId });
    }

    /**
     * Start work on a job
     */
    async startWork(jobId: string, userId: string, otp: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (!jobRules.canStartWork(job.status, userId, job.awardedInstallerId)) {
            throw new Error('Cannot start work - check status and permissions');
        }

        // Verify OTP
        if (!job.startOtp || job.startOtp !== otp) {
            throw new Error('Invalid start OTP');
        }

        await jobRepository.update(jobId, {
            workStartedAt: new Date(),
        });

        await jobRepository.updateStatus(jobId, 'In Progress', userId, 'Work started with OTP');
        logger.userActivity(userId, 'work_started', { jobId });
    }

    /**
     * Submit work
     */
    async submitWork(jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.awardedInstallerId !== userId) {
            throw new Error('Not authorized');
        }

        if (!jobRules.canTransitionTo(job.status, 'work_submitted')) {
            throw new Error(`Cannot submit work in ${job.status} status`);
        }

        await jobRepository.update(jobId, {
            workSubmittedAt: new Date(),
        });

        await jobRepository.updateStatus(jobId, 'Pending Confirmation', userId, 'Work submitted by installer');
        logger.userActivity(userId, 'work_submitted', { jobId });
    }

    /**
     * Mark job as complete
     */
    /**
     * Mark job as complete using OTP (Installer flows)
     */
    async completeJobWithOtp(jobId: string, userId: string, otp: string, attachments: any[] = []): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.awardedInstallerId !== userId && (typeof job.awardedInstaller === 'string' ? job.awardedInstaller !== userId : job.awardedInstaller?.id !== userId)) {
            throw new Error('Not authorized');
        }

        // Verify OTP
        if (!job.completionOtp || job.completionOtp !== otp) {
            throw new Error('Invalid completion OTP');
        }

        // Release Funds
        // Only release if funded?
        // paymentService.releaseFunds handles checks.
        // We need installerId (payee).
        const installerId = userId;
        await paymentService.releaseFunds(jobId, installerId);

        // Update Job
        await jobRepository.update(jobId, {
            completionTimestamp: new Date(),
            status: 'Completed',
            // attachments: FieldValue.arrayUnion(...attachments) // Handled by repository if supported, or basic update
            // Using generic update:
            ...(attachments.length > 0 ? { attachments: FieldValue.arrayUnion(...attachments) as any } : {}),
            completionOtp: FieldValue.delete() as any
        });

        await jobRepository.updateStatus(jobId, 'Completed', userId, 'Job marked complete with OTP');
        logger.userActivity(userId, 'job_completed', { jobId });

        // AI Learning: Record actuals
        try {
            // Calculate duration
            const workStartedAt: any = job.workStartedAt;
            const startTime = workStartedAt?.toDate ? workStartedAt.toDate() : new Date(workStartedAt);
            const endTime = new Date();
            const durationHours = !isNaN(startTime.getTime()) ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : 0;

            // Find price (from accepted bid)
            // The userId here is the Installer.
            const acceptedBid = job.bids.find(b => {
                const bInstallerId = typeof b.installer === 'string' ? b.installer : (b.installer as any)?.id || b.installerId;
                return bInstallerId === userId;
            });
            const finalPrice = acceptedBid?.amount || 0;

            // Update outcomes (fire and forget)
            aiLearningService.updateOutcome(jobId, 'price_estimate', { success: true, actualValue: finalPrice });
            aiLearningService.updateOutcome(jobId, 'time_estimate', { success: true, actualValue: durationHours });
        } catch (e) {
            console.warn('Failed to update AI outcomes on job completion:', e);
        }
    }

    /**
     * Approve Job (Job Giver Manually confirms)
     */
    async approveJob(jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        if (job.jobGiverId !== userId) throw new Error('Not authorized');
        if (job.status !== 'Pending Confirmation') throw new Error('Job not ready for approval');

        // Release Funds
        const installerId = job.awardedInstallerId || (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id!);
        await paymentService.releaseFunds(jobId, installerId);

        // Generate Invoice (Simplified)
        // TODO: Move to InvoiceService
        const invoiceData = {
            id: `INV-${jobId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`,
            jobId,
            jobTitle: job.title,
            date: Timestamp.now(),
            totalAmount: 0 // Should calculate? API calculated it. For now assume PaymentService logic handles transaction truth.
            // We need to fetch Transaction to get amounts for Invoice.
            // But JobService shouldn't ideally depend on Payment implementation details too deeply.
            // Keeping it simple: Just mark completed. Invoice can be generated/fetched dynamically or async.
        };

        await jobRepository.update(jobId, {
            status: 'Completed',
            completionTimestamp: new Date(),
            paymentReleasedAt: new Date(),
            // invoice: invoiceData // API saved it.
        });

        await jobRepository.updateStatus(jobId, 'Completed', userId, 'Job approved by Giver');
        logger.userActivity(userId, 'job_approved', { jobId });

        // AI Learning: Record actuals (for manual approval flow)
        try {
            const workStartedAt: any = job.workStartedAt;
            const startTime = workStartedAt?.toDate ? workStartedAt.toDate() : new Date(workStartedAt);
            const endTime = new Date();
            const durationHours = !isNaN(startTime.getTime()) ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : 0;

            // For price, use the invoice total or accepted bid
            const acceptedBid = job.bids.find(b => b.installerId === job.awardedInstallerId || b.id === job.awardedInstallerId /* sloppy match logic from service */);
            // Better: use job.awardedInstallerId to find bid
            const winningBid = job.bids.find(b => {
                const bInstallerId = typeof b.installer === 'string' ? b.installer : (b.installer as any)?.id || b.installerId;
                return bInstallerId === job.awardedInstallerId;
            });
            const finalPrice = winningBid?.amount || 0;

            aiLearningService.updateOutcome(jobId, 'price_estimate', { success: true, actualValue: finalPrice });
            aiLearningService.updateOutcome(jobId, 'time_estimate', { success: true, actualValue: durationHours });
        } catch (e) {
            console.warn('Failed to update AI outcomes on job approval:', e);
        }
    }

    /**
     * Cancel a job
     */
    async cancelJob(jobId: string, userId: string, reason: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Verify authorization (jobGiver or admin)
        if (job.jobGiverId !== userId && job.awardedInstallerId !== userId) {
            throw new Error('Not authorized to cancel this job');
        }

        await jobRepository.update(jobId, {
            cancellationReason: reason,
            cancellationProposer: job.jobGiverId === userId ? 'Job Giver' : 'Installer',
        });

        await jobRepository.updateStatus(jobId, 'Cancelled', userId, reason);
        logger.userActivity(userId, 'job_cancelled', { jobId, reason });
    }

    /**
     * Get job statistics for a job giver
     */
    async getStatsForJobGiver(userId: string): Promise<JobStats> {
        try {
            return await jobRepository.getStatsForJobGiver(userId);
        } catch (error) {
            logger.error('Failed to get job stats', error, { userId });
            throw error;
        }
    }

    /**
     * Get job statistics for an installer
     */
    async getStatsForInstaller(userId: string): Promise<InstallerStats> {
        try {
            return await jobRepository.getStatsForInstaller(userId);
        } catch (error) {
            logger.error('Failed to get installer stats', error, { userId });
            throw error;
        }
    }

    /**
     * Promote a job (update travel tip and deadline and re-open)
     */
    async promoteJob(jobId: string, userId: string, travelTip: number, deadline: Date): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        if (job.jobGiverId !== userId) {
            throw new Error('Unauthorized');
        }

        await jobRepository.update(jobId, {
            travelTip,
            deadline,
        });

        await jobRepository.updateStatus(jobId, 'Open for Bidding', userId, 'Job promoted and re-listed');
        logger.userActivity(userId, 'job_promoted', { jobId });
    }

    /**
     * Handle job rescheduling
     */
    async rescheduleJob(
        jobId: string,
        userId: string,
        action: 'propose' | 'accept' | 'reject' | 'dismiss',
        proposedDate?: Date
    ): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        const isJobGiver = (typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id) === userId;
        const installerId = job.awardedInstallerId || (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id);
        const isInstaller = installerId === userId;

        if (!isJobGiver && !isInstaller) {
            throw new Error('Unauthorized');
        }

        if (action === 'propose') {
            if (!proposedDate) throw new Error('Proposed date is required');
            await jobRepository.update(jobId, {
                dateChangeProposal: {
                    newDate: proposedDate,
                    proposedBy: isJobGiver ? 'Job Giver' : 'Installer',
                    status: 'pending',
                },
            });
        } else if (action === 'accept') {
            if (!job.dateChangeProposal || job.dateChangeProposal.status !== 'pending') {
                throw new Error('No pending proposal found');
            }
            if ((job.dateChangeProposal.proposedBy === 'Job Giver' && isJobGiver) ||
                (job.dateChangeProposal.proposedBy === 'Installer' && isInstaller)) {
                throw new Error('You cannot accept your own proposal');
            }
            const newDate = (job.dateChangeProposal.newDate as any).toDate ? (job.dateChangeProposal.newDate as any).toDate() : new Date(job.dateChangeProposal.newDate as any);
            await jobRepository.update(jobId, {
                jobStartDate: newDate,
                ['dateChangeProposal.status' as any]: 'accepted',
            } as any);
        } else if (action === 'reject') {
            await jobRepository.update(jobId, {
                ['dateChangeProposal.status' as any]: 'rejected',
            } as any);
        } else if (action === 'dismiss') {
            await jobRepository.update(jobId, {
                dateChangeProposal: FieldValue.delete() as any,
            });
        }
    }

    /**
     * Perform batch operations on jobs
     */
    async batchAction(userId: string, jobIds: string[], action: 'archive' | 'delete'): Promise<number> {
        let count = 0;
        for (const jobId of jobIds) {
            const job = await jobRepository.fetchById(jobId);
            if (job && job.jobGiverId === userId) {
                if (action === 'archive') {
                    await jobRepository.archive(jobId);
                } else if (action === 'delete') {
                    await jobRepository.archive(jobId);
                }
                count++;
            }
        }
        return count;
    }

    /**
     * Get Quick Metrics for Dashboard (Last 90 Days)
     */
    async getQuickMetrics(userId: string): Promise<{
        avgBidsPerJob: number;
        avgTimeToFirstBid: string;
        pendingReviews: number;
        favoriteInstallers: number;
    }> {
        // Calculate date 90 days ago
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const jobs = await jobRepository.fetchByJobGiverSince(userId, ninetyDaysAgo);

        // 1. Average Bids Per Job
        const jobsWithBids = jobs.filter(job => job.bids && job.bids.length > 0);
        const totalBids = jobsWithBids.reduce((sum, job) => sum + (job.bids?.length || 0), 0);
        const avgBidsPerJob = jobsWithBids.length > 0 ? Number((totalBids / jobsWithBids.length).toFixed(1)) : 0;

        // 2. Average Time to First Bid
        const avgTimeToFirstBid = "~";

        // 3. Pending Reviews (Completed jobs without ratings)
        const pendingReviews = jobs.filter(
            job => (job.status === "Completed" || job.status === "completed") && !job.installerReview
        ).length;

        // 4. Favorite Installers - This should be fetched via User Domain, returning 0 as placeholder for service isolation
        const favoriteInstallers = 0;

        return {
            avgBidsPerJob,
            avgTimeToFirstBid,
            pendingReviews,
            favoriteInstallers
        };
    }
    /**
     * Get unique installer IDs that a job giver has worked with (completed jobs)
     */
    async getRelatedInstallerIds(userId: string): Promise<string[]> {
        const jobs = await jobRepository.fetchCompletedJobsForJobGiver(userId);
        const installerIds = new Set<string>();

        jobs.forEach(job => {
            if (job.awardedInstallerId) {
                installerIds.add(job.awardedInstallerId);
            }
        });

        return Array.from(installerIds);
    }
}

export const jobService = new JobService();
