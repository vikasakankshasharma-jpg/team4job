// domains/jobs/job.service.ts

import { jobRepository } from './job.repository';
import { bidRepository } from '../bids/bid.repository';
import { jobRules } from './job.rules';
import { Job, JobStatus, CreateJobInput, JobFilters, JobStats, ProfessionalStats, ClientStats } from './job.types'; // Updated imports

import { Role, User } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import { paymentService } from '../payments/payment.service';
import { Timestamp } from 'firebase-admin/firestore';
import { aiLearningService } from '@/ai/services/ai-learning.service';
import { userRepository } from '../users/user.repository';
import { emailService } from '@/lib/email/email-service';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { platformEventEmitter } from '@/lib/events/event-emitter';

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
            throw new Error('Only Clients can create jobs');
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
                clientId: userId,
                status: 'open',
                bids: [],
                comments: [],
                bidderIds: [],
                statusHistory: [],
            };

            const jobId = await jobRepository.create(job);

            platformEventEmitter.emit({
                name: 'job.created',
                occurredAt: new Date().toISOString(),
                payload: { jobId, clientId: userId },
            });

            // Increment Client stats
            userRepository.incrementStats(userId, { activeJobs: 1 }).catch(e => { /* Failed to increment activeJobs */ });

            // AI Learning Linkage (Async, don't block)
            aiLearningService.linkLogToEntity(userId, jobId, 'price_estimate').catch(err => { /* AI linkage failed (price_estimate) */ });
            aiLearningService.linkLogToEntity(userId, jobId, 'time_estimate').catch(err => { /* AI linkage failed (time_estimate) */ });

            return jobId;
        } catch (error: any) {
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
        if (userRole !== 'Admin' && job.clientId !== userId) {
            throw new Error('Not authorized to post this job');
        }

        // Verify state transition
        if (!jobRules.canTransitionTo(job.status, 'open')) {
            throw new Error(`Cannot transition from ${job.status} to open`);
        }

        await jobRepository.updateStatus(jobId, 'Open for Bidding', userId, 'Job posted publicly');
    }

    /**
     * Get jobs for client dashboard
     */
    async listJobsForClient(userId: string, limit = 50, lastPostedAt?: Date): Promise<Job[]> {
        try {
            return await jobRepository.fetchByClient(userId, limit);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get bids placed by a specific Professional across all jobs
     */
    async getBidsByProfessional(userId: string): Promise<any[]> {
        const jobs = await jobRepository.fetchByProfessional(userId);
        const userBids: any[] = [];

        jobs.forEach(job => {
            const bids = (job as any).bids || [];
            bids.forEach((bid: any) => {
                const professionalId = typeof bid.professional === 'string'
                    ? bid.professional
                    : bid.professional?.id || bid.professionalId;

                if (professionalId === userId) {
                    userBids.push({
                        ...bid,
                        jobId: job.id,
                        jobTitle: job.title,
                        jobStatus: job.status,
                        clientId: job.clientId,
                        job: job
                    });
                }
            });
        });

        return userBids;
    }

    /**
     * Get open jobs for browsing (Professional view)
     */
    async listOpenJobs(filters?: JobFilters, limit = 50, lastPostedAt?: Date): Promise<Job[]> {
        try {
            return await jobRepository.fetchOpen(filters, limit, lastPostedAt);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get jobs for Professional (bids + awarded jobs)
     */
    async listJobsForProfessional(professionalId: string): Promise<Job[]> {
        try {
            return await jobRepository.fetchByProfessional(professionalId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get single job details
     */
    async getJobById(jobId: string, userId: string, userRole?: Role): Promise<Job> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Check visibility permissions
        const isPublic = ['open', 'Open for Bidding'].includes(job.status);
        const ownerId = job.clientId || (typeof job.client === 'string' ? job.client : job.client?.id);
        const isOwner = ownerId === userId;
        const isAwardee = job.awardedProfessionalId === userId;
        const isAdmin = userRole === 'Admin' || userRole === 'Support Team';
        const isBidder = job.bidderIds?.includes(userId);

        const isSystem = ['system-ssr', 'system-metadata', 'system-ssr-bid'].includes(userId);

        if (!isPublic && !isOwner && !isAwardee && !isAdmin && !isBidder && !isSystem) {
            throw new Error('You do not have permission to view this job');
        }

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

        const ownerId = job.clientId || (typeof job.client === 'string' ? job.client : job.client?.id);
        const isOwner = ownerId === userId;
        // Use awardedProfessionalId specific field first
        const awardedId = job.awardedProfessionalId || (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id);
        const isAwarded = awardedId === userId;

        if (!isOwner && !isAwarded) {
            throw new Error('Unauthorized update attempt');
        }

        // --- Chat Moderation (Revenue Protection) ---
        if (updates.privateMessages && updates.privateMessages.length > 0) {
            const lastMsg = updates.privateMessages[updates.privateMessages.length - 1];
            if (lastMsg && lastMsg.content) {
                const { moderateMessageFlow } = await import('@/ai/flows/moderate-message');
                const moderation = await moderateMessageFlow({
                    message: lastMsg.content,
                    userId: userId,
                    limitType: 'ai_chat'
                });

                if (moderation.isFlagged) {
                    throw new Error(moderation.reason || "Message blocked by safety filters.");
                }
            }
        }

        await jobRepository.update(jobId, updates);
    }

    /**
     * Award a job to an Professional
     */
    async awardJob(jobId: string, userId: string, professionalId: string, acceptanceDeadline: Date): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        const ownerId = job.clientId || (typeof job.client === 'string' ? job.client : job.client?.id);
        if (ownerId !== userId) throw new Error('Unauthorized: Only job owner can award job');

        if (job.status !== 'open' && job.status !== 'Open for Bidding') {
            throw new Error(`Job is not available for awarding (Status: ${job.status})`);
        }

        if (!professionalId) {
            throw new Error('Professional ID is required to award job');
        }

        const updates: Partial<Job> = {
            status: 'bid_accepted',
            awardedProfessionalId: professionalId,
            awardedProfessional: getAdminDb().collection('users').doc(professionalId) as any,
            acceptanceDeadline: acceptanceDeadline,
        };

        await jobRepository.update(jobId, updates);

        // Increment Professional stats (Awarded/Won)
        userRepository.incrementStats(professionalId, { jobsWon: 1 }).catch(e => { /* Failed to increment jobsWon */ });

        // Send Job Awarded Email
        userRepository.fetchById(professionalId).then(Professional => {
            if (Professional) {
                emailService.sendJobAwardedEmail({
                    to: Professional.email,
                    userName: Professional.name,
                    jobTitle: job.title,
                    jobLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/dashboard/jobs/${jobId}`
                });
            }
        }).catch(e => { /* Award email fetch failed */ });
    }

    /**
     * Get bids for a specific job
     */
    async getBidsForJob(jobId: string, userId: string): Promise<any[]> {
        const job = await this.getJobById(jobId, userId);

        // Fetch bids from the new subcollection architecture
        const bids = await bidRepository.fetchByJob(jobId);

        // Enhance bids with professional profiles
        const enhancedBids = await Promise.all(bids.map(async (bid) => {
            const profId = typeof bid.professional === 'string' 
                ? bid.professional 
                : bid.professionalId || (bid.professional as any)?.id;
            
            if (profId) {
                const profUser = await userRepository.fetchById(profId);
                if (profUser) {
                    return {
                        ...bid,
                        professional: {
                            id: profUser.id,
                            name: profUser.name,
                            avatarUrl: profUser.avatarUrl,
                            professionalProfile: profUser.professionalProfile
                        }
                    };
                }
            }
            return bid;
        }));

        return enhancedBids || [];
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
        if (!jobRules.canAcceptBid(job.status, userId, job.clientId, userRole)) {
            throw new Error('Cannot accept bid - check job status and permissions');
        }

        // Find the bid
        const bid = job.bids.find(b => b.id === bidId);
        if (!bid) {
            throw new Error('Bid not found');
        }

        // Extract Professional ID
        const professionalId = typeof bid.professional === 'string'
            ? bid.professional
            : (bid.professional as any).id || bid.professionalId;

        // Update job
        await jobRepository.update(jobId, {
            awardedProfessionalId: professionalId,
            awardedProfessional: bid.professional,
        });

        await jobRepository.updateStatus(
            jobId,
            'Awarded',
            userId,
            `Accepted bid from ${professionalId}`
        );

        platformEventEmitter.emit({
            name: 'job.awarded',
            occurredAt: new Date().toISOString(),
            payload: { jobId, clientId: userId, professionalId },
        });

        // Increment Professional stats (Awarded/Won)
        userRepository.incrementStats(professionalId, { jobsWon: 1 }).catch(e => { /* Failed to increment jobsWon */ });

        // Send Job Awarded Email
        userRepository.fetchById(professionalId).then(Professional => {
            if (Professional) {
                emailService.sendJobAwardedEmail({
                    to: Professional.email,
                    userName: Professional.name,
                    jobTitle: job.title,
                    jobLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/dashboard/jobs/${jobId}`
                });
            }
        }).catch(e => { /* Award email fetch failed */ });
    }

    /**
     * Accept a job assignment (Professional accepts the award)
     */
    async acceptJobAssignment(jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.status !== 'bid_accepted' && job.status !== 'Awarded') {
            throw new Error(`Job is not available for acceptance (Status: ${job.status})`);
        }

        const awardedId = job.awardedProfessionalId || (
            typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id
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
            'Professional accepted job'
        );
    }

    /**
     * Fund a job (transition from bid_accepted to funded)
     */
    async fundJob(jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.clientId !== userId) {
            throw new Error('Not authorized to fund this job');
        }

        // Validate state transition
        const canFund = job.status === 'bid_accepted' || job.status === 'Pending Funding';
        if (!canFund) {
            throw new Error(`Cannot fund job in current status: ${job.status}`);
        }

        const startOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const completionOtp = Math.floor(100000 + Math.random() * 900000).toString();

        await jobRepository.update(jobId, {
            startOtp,
            completionOtp,
            fundedAt: new Date(),
        });

        await jobRepository.updateStatus(jobId, 'funded', userId, 'Job successfully funded by Giver');
    }

    /**
     * Start work on a job
     */
    async startWork(jobId: string, userId: string, otp: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (!jobRules.canStartWork(job.status, userId, job.awardedProfessionalId)) {
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
    }

    /**
     * Submit work
     */
    async submitWork(jobId: string, userId: string, attachments?: any[]): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.awardedProfessionalId !== userId) {
            throw new Error('Not authorized');
        }

        if (!jobRules.canTransitionTo(job.status, 'work_submitted')) {
            throw new Error(`Cannot submit work in ${job.status} status`);
        }

        const updates: any = {
            workSubmittedAt: new Date(),
        };

        if (attachments && attachments.length > 0) {
            updates.attachments = attachments;
        }

        await jobRepository.update(jobId, updates);

        await jobRepository.updateStatus(jobId, 'Pending Confirmation', userId, 'Work submitted by Professional');
    }

    /**
     * Mark job as complete using OTP (Professional flows)
     */
    async completeJobWithOtp(jobId: string, userId: string, otp: string, attachments: any[] = []): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.awardedProfessionalId !== userId && (typeof job.awardedProfessional === 'string' ? job.awardedProfessional !== userId : job.awardedProfessional?.id !== userId)) {
            throw new Error('Not authorized');
        }

        // Verify OTP
        if (!job.completionOtp || job.completionOtp !== otp) {
            throw new Error('Invalid completion OTP');
        }

        // Release Funds
        const professionalId = userId;
        await paymentService.releaseFunds(jobId, professionalId);

        // Update Job
        await jobRepository.update(jobId, {
            completionTimestamp: new Date(),
            status: 'Completed',
            ...(attachments.length > 0 ? { attachments: FieldValue.arrayUnion(...attachments) as any } : {}),
            completionOtp: FieldValue.delete() as any
        });

        await jobRepository.updateStatus(jobId, 'Completed', userId, 'Job marked complete with OTP');

        // Data Aggregation: Update Stats
        const clientId = job.clientId;
        userRepository.incrementStats(clientId, { activeJobs: -1, completedJobs: 1 });

        // Find amount for Professional earnings
        const finalBid = job.bids?.find(b => (typeof b.professional === 'string' ? b.professional : b.professional?.id) === professionalId);
        const amount = finalBid?.amount || 0;
        userRepository.incrementStats(professionalId, { activeJobs: -1, completedJobs: 1, totalEarnings: amount });



        // AI Learning: Record actuals
        try {
            const workStartedAt: any = job.workStartedAt;
            const startTime = workStartedAt?.toDate ? workStartedAt.toDate() : new Date(workStartedAt);
            const endTime = new Date();
            const durationHours = !isNaN(startTime.getTime()) ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : 0;

            const acceptedBid = job.bids.find(b => {
                const bprofessionalId = typeof b.professional === 'string' ? b.professional : (b.professional as any)?.id || b.professionalId;
                return bprofessionalId === userId;
            });
            const finalPrice = acceptedBid?.amount || 0;

            aiLearningService.updateOutcome(jobId, 'price_estimate', { success: true, actualValue: finalPrice });
            aiLearningService.updateOutcome(jobId, 'time_estimate', { success: true, actualValue: durationHours });
        } catch (e) {
            // Silently handle AI sync failures
        }
    }

    /**
     * Approve Job (Client Manually confirms)
     */
    async approveJob(jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        if (job.clientId !== userId) throw new Error('Not authorized');
        if (job.status !== 'Pending Confirmation') throw new Error('Job not ready for approval');

        // Release Funds
        const professionalId = job.awardedProfessionalId || (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id!);
        await paymentService.releaseFunds(jobId, professionalId);

        await jobRepository.update(jobId, {
            status: 'Completed',
            completionTimestamp: new Date(),
            paymentReleasedAt: new Date(),
        });

        await jobRepository.updateStatus(jobId, 'Completed', userId, 'Job approved by Giver');

        // Data Aggregation: Update Stats
        userRepository.incrementStats(userId, { activeJobs: -1, completedJobs: 1 });

        const winningBid = job.bids?.find(b => (typeof b.professional === 'string' ? b.professional : b.professional?.id) === professionalId);
        const amount = winningBid?.amount || 0;
        userRepository.incrementStats(professionalId, { activeJobs: -1, completedJobs: 1, totalEarnings: amount });



        // AI Learning: Record actuals (for manual approval flow)
        try {
            const workStartedAt: any = job.workStartedAt;
            const startTime = workStartedAt?.toDate ? workStartedAt.toDate() : new Date(workStartedAt);
            const endTime = new Date();
            const durationHours = !isNaN(startTime.getTime()) ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : 0;

            const winningBid = job.bids.find(b => {
                const bprofessionalId = typeof b.professional === 'string' ? b.professional : (b.professional as any)?.id || b.professionalId;
                return bprofessionalId === job.awardedProfessionalId;
            });
            const finalPrice = winningBid?.amount || 0;

            aiLearningService.updateOutcome(jobId, 'price_estimate', { success: true, actualValue: finalPrice });
            aiLearningService.updateOutcome(jobId, 'time_estimate', { success: true, actualValue: durationHours });
        } catch (e) {
            // Silently handle AI sync failures
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

        // Verify authorization (client or admin)
        if (job.clientId !== userId && job.awardedProfessionalId !== userId) {
            throw new Error('Not authorized to cancel this job');
        }

        await jobRepository.update(jobId, {
            cancellationReason: reason,
            cancellationProposer: job.clientId === userId ? 'Client' : 'Professional',
        });

        await jobRepository.updateStatus(jobId, 'Cancelled', userId, reason);
    }

    /**
     * Get job statistics for a client
     */
    async getStatsForClient(userId: string): Promise<ClientStats> {
        try {
            return await jobRepository.getStatsForClient(userId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get job statistics for an Professional
     */
    async getStatsForProfessional(userId: string): Promise<ProfessionalStats> {
        try {
            return await jobRepository.getStatsForProfessional(userId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Promote a job (update travel tip and deadline and re-open)
     */
    async promoteJob(jobId: string, userId: string, travelTip: number, deadline: Date): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        if (job.clientId !== userId) {
            throw new Error('Unauthorized');
        }

        await jobRepository.update(jobId, {
            travelTip,
            deadline,
        });

        await jobRepository.updateStatus(jobId, 'Open for Bidding', userId, 'Job promoted and re-listed');
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

        const isclient = (typeof job.client === 'string' ? job.client : job.client.id) === userId;
        const professionalId = job.awardedProfessionalId || (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id);
        const isProfessional = professionalId === userId;

        if (!isclient && !isProfessional) {
            throw new Error('Unauthorized');
        }

        if (action === 'propose') {
            if (!proposedDate) throw new Error('Proposed date is required');
            await jobRepository.update(jobId, {
                dateChangeProposal: {
                    newDate: proposedDate,
                    proposedBy: isclient ? 'Client' : 'Professional',
                    status: 'pending',
                },
            });
        } else if (action === 'accept') {
            if (!job.dateChangeProposal || job.dateChangeProposal.status !== 'pending') {
                throw new Error('No pending proposal found');
            }
            if ((job.dateChangeProposal.proposedBy === 'Client' && isclient) ||
                (job.dateChangeProposal.proposedBy === 'Professional' && isProfessional)) {
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
            if (job && job.clientId === userId) {
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
        favoriteProfessionals: number;
    }> {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const jobs = await jobRepository.fetchByClientSince(userId, ninetyDaysAgo);

        const jobsWithBids = jobs.filter(job => job.bids && job.bids.length > 0);
        const totalBids = jobsWithBids.reduce((sum, job) => sum + (job.bids?.length || 0), 0);
        const avgBidsPerJob = jobsWithBids.length > 0 ? Number((totalBids / jobsWithBids.length).toFixed(1)) : 0;

        const avgTimeToFirstBid = "~";

        const pendingReviews = jobs.filter(
            job => (job.status === "Completed" || job.status === "completed") && !job.professionalReview
        ).length;

        const favoriteProfessionals = 0;

        return {
            avgBidsPerJob,
            avgTimeToFirstBid,
            pendingReviews,
            favoriteProfessionals
        };
    }

    /**
     * Get unique Professional IDs that a client has worked with (completed jobs)
     */
    async getRelatedprofessionalIds(userId: string): Promise<string[]> {
        const jobs = await jobRepository.fetchCompletedJobsForClient(userId);
        const professionalIds = new Set<string>();

        jobs.forEach(job => {
            if (job.awardedProfessionalId) {
                professionalIds.add(job.awardedProfessionalId);
            }
        });

        return Array.from(professionalIds);
    }

    /**
     * Securely fetch contact details of the other party
     */
    async getCounterParty(jobId: string, userId: string): Promise<Partial<User> | null> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        // Check if job is in a state where contacts can be revealed (funded or later)
        const revealableStatuses: JobStatus[] = ['funded', 'in_progress', 'work_submitted', 'completed', 'disputed', 'In Progress', 'Completed', 'Pending Confirmation'];
        if (!revealableStatuses.includes(job.status)) {
            return null;
        }

        const isclient = job.clientId === userId;
        const professionalId = job.awardedProfessionalId || (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id);
        const isProfessional = professionalId === userId;

        if (!isclient && !isProfessional) {
            throw new Error('Not authorized to view contacts for this job');
        }

        const targetId = isclient ? professionalId : job.clientId;
        if (!targetId) return null;

        const targetUser = await userRepository.fetchById(targetId);
        if (!targetUser) return null;

        return {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            mobile: targetUser.mobile,
            avatarUrl: targetUser.avatarUrl,
            roles: targetUser.roles
        };
    }

    /**
     * Raise a dispute for a job
     */
    async raiseDispute(
        jobId: string,
        userId: string,
        reason: string,
        description: string,
        category: "Job Dispute" | "Billing Inquiry" | "Technical Support" | "Skill Request" | "General Question" = "Job Dispute",
        attachments: { fileName: string; fileUrl: string; fileType: string; }[] = []
    ): Promise<string> {
        const job = await this.getJobById(jobId, userId);

        // 1. Create Dispute Record
        const disputeId = await jobRepository.createDispute({
            jobId,
            jobTitle: job.title,
            requesterId: userId,
            category,
            reason,
            title: `Dispute: ${reason}`,
            description,
            status: 'Open',
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

        // 2. Update Transaction Status
        const db = getAdminDb();
        const transQuery = await db.collection('transactions').where("jobId", "==", jobId).limit(1).get();
        if (!transQuery.empty) {
            const transDoc = transQuery.docs[0];
            if (transDoc.data().status === 'funded') {
                await transDoc.ref.update({ status: 'disputed' });
            }
        }

        // 3. Update Job Status
        await jobRepository.update(jobId, {
            status: 'disputed',
            disputeId: disputeId
        });

        // 4. Send Notifications
        const otherPartyId = job.clientId === userId ? job.awardedProfessionalId : job.clientId;
        if (otherPartyId) {
            const [otherParty, requester] = await Promise.all([
                userRepository.fetchById(otherPartyId),
                userRepository.fetchById(userId)
            ]);

            if (otherParty && requester) {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dodo-test.web.app';
                await emailService.sendDisputeRaisedEmail({
                    to: otherParty.email,
                    userName: otherParty.name,
                    jobTitle: job.title,
                    reason,
                    disputeLink: `${baseUrl}/dashboard/disputes/${disputeId}`
                });
            }
        }

        return disputeId;
    }

    /**
     * Send a communication message for a job
     */
    async sendCommunication(
        jobId: string,
        senderId: string,
        content: string,
        attachments: { fileName: string; fileUrl: string; fileType: string; }[] = []
    ): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error("Job not found");

        const isClient = job.clientId === senderId;
        const msgType = isClient ? 'job_giver_message' : 'Professional_message';

        // 1. Save to Repository
        await jobRepository.addCommunication(jobId, {
            jobId,
            type: msgType,
            content: content.trim(),
            author: senderId,
            authorName: isClient ? 'Client' : 'Professional',
            read: false,
            attachments
        });

        // 2. Notify recipient
        const recipientId = isClient ? job.awardedProfessionalId : job.clientId;
        if (recipientId) {
            const [recipient, sender] = await Promise.all([
                userRepository.fetchById(recipientId),
                userRepository.fetchById(senderId)
            ]);

            if (recipient && sender) {
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
    }
}

export const jobService = new JobService();



