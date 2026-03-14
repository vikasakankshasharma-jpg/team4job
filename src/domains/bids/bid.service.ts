// domains/bids/bid.service.ts

import { bidRules } from './bid.rules';
import { CreateBidInput, Bid } from './bid.types';
import { jobRepository } from '../jobs/job.repository';
import { bidRepository } from './bid.repository'; // Import added

import { Role } from '@/lib/types';
import { userRepository } from '../users/user.repository';
import { emailService } from '@/lib/email/email-service';

/**
 * Bid Service - Business logic for bid management
 */
export class BidService {
    /**
     * Place a bid on a job
     */
    async placeBid(
        userId: string,
        userRole: Role,
        data: CreateBidInput
    ): Promise<void> {
        // Get the job
        const job = await jobRepository.fetchById(data.jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Check permissions
        if (!bidRules.canPlaceBid(userRole, job.status, job.jobGiverId, userId)) {
            throw new Error('Cannot place bid on this job');
        }

        // Validate bid data
        const validation = bidRules.validateBidData(data, job.priceEstimate);
        if (!validation.valid) {
            throw new Error(`Invalid bid: ${validation.errors.join(', ')}`);
        }

        // Check if user already bid 
        // Note: checking job.bidderIds is faster than fetching all bids if we trust it
        if (job.bidderIds?.includes(userId)) {
            throw new Error('You have already placed a bid on this job');
        }

        // Create bid object
        const bid: Partial<Bid> = {
            ...data,
            installerId: userId,
            jobGiverId: job.jobGiverId,
            status: 'active',
            // timestamp added by repository
        };

        // 1. Create Bid in Subcollection
        const bidId = await bidRepository.create(data.jobId, bid);

        // 2. Update Job (bidderIds for checks)
        // We do NOT update the `bids` array on the Job document anymore to strictly use subcollections
        const updatedBidderIds = [...(job.bidderIds || []), userId];

        await jobRepository.update(data.jobId, {
            bidderIds: updatedBidderIds,
        });

        // Data Aggregation: Update Stats
        userRepository.incrementStats(job.jobGiverId, { totalBids: 1 }).catch(() => {});
        userRepository.incrementStats(userId, { myBids: 1 }).catch(() => {});

        // Send Bid Received Notification to Job Giver
        userRepository.fetchById(job.jobGiverId).then(giver => {
            if (giver) {
                emailService.sendBidReceivedEmail({
                    to: giver.email,
                    userName: giver.name,
                    jobTitle: job.title,
                    jobLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/dashboard/jobs/${data.jobId}`
                });
            }
        }).catch(() => {});


    }

    /**
     * Withdraw a bid
     */
    async withdrawBid(bidId: string, jobId: string, userId: string): Promise<void> {
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        const bid = await bidRepository.fetchById(jobId, bidId);
        if (!bid) {
            throw new Error('Bid not found');
        }

        const bidInstallerId = typeof bid.installer === 'string'
            ? bid.installer
            : (bid.installer as any).id || bid.installerId;

        if (!bidRules.canWithdrawBid(userId, bidInstallerId!, job.status)) {
            throw new Error('Cannot withdraw this bid');
        }

        // Remove bid from job (bidderIds)
        const updatedBidderIds = (job.bidderIds || []).filter(id => id !== userId);

        await jobRepository.update(jobId, {
            bidderIds: updatedBidderIds,
        });

        // Data Aggregation: Decrement Stats
        userRepository.incrementStats(job.jobGiverId, { totalBids: -1 }).catch(() => {});
        userRepository.incrementStats(userId, { myBids: -1 }).catch(() => {});


    }

    /**
     * Get all bids for a job
     */
    async listBidsForJob(jobId: string): Promise<Bid[]> {
        return bidRepository.fetchByJob(jobId);
    }
}

export const bidService = new BidService();
