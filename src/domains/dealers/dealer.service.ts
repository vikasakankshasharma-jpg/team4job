import { dealerRepository } from './dealer.repository';
import { jobService } from '../jobs/job.service';
import { CreateJobInput, Job } from '../jobs/job.types';

export class DealerService {
    /**
     * Create a Job safely with Idempotency
     */
    async createJob(dealerId: string, data: Partial<Job>, idempotencyKey: string): Promise<string> {
        // 1. Check Idempotency and Lock
        const idempotency = await dealerRepository.acquireIdempotencyKey(idempotencyKey, dealerId, data);
        if (idempotency.status === 'COMPLETED') {
            return idempotency.result as string; // Return cached jobId
        }

        try {
            // 2. Validate Dealer context
            if (data.requesterType !== 'DEALER') {
                throw new Error('Invalid requester type for Dealer API');
            }

            // 3. Delegate to core Job Service (Ensures DRY business logic)
            // Note: The userId passed is the dealerId (the authenticated dealer admin)
            const jobId = await jobService.createJob(dealerId, 'Client', data as CreateJobInput);
            
            // 4. Mark Idempotency as Complete
            await dealerRepository.completeIdempotencyKey(idempotencyKey, jobId);
            
            return jobId;
        } catch (error) {
            await dealerRepository.failIdempotencyKey(idempotencyKey);
            throw error;
        }
    }

    /**
     * Submit Job for Matching (Transition to OPEN)
     */
    async submitForMatching(dealerId: string, jobId: string, idempotencyKey: string): Promise<void> {
        const idempotency = await dealerRepository.acquireIdempotencyKey(idempotencyKey, dealerId, { action: 'submitForMatching', jobId });
        if (idempotency.status === 'COMPLETED') {
            return;
        }

        try {
            const job = await jobService.getJobById(jobId, dealerId, 'Client');
            if (!job) throw new Error('Job not found');
            if (job.dealerId !== dealerId) {
                throw new Error('Not authorized to manage this job');
            }

            if (job.status !== 'draft') {
                throw new Error('Duplicate request: Already submitted for matching.');
            }

            await jobService.postJob(jobId, dealerId, 'Client');
            await dealerRepository.completeIdempotencyKey(idempotencyKey, { success: true });
        } catch (error) {
            await dealerRepository.failIdempotencyKey(idempotencyKey);
            throw error;
        }
    }

    /**
     * Award Installer (Concurrency safe via JobService logic)
     */
    async awardInstaller(dealerId: string, jobId: string, professionalId: string, idempotencyKey: string): Promise<void> {
        const idempotency = await dealerRepository.acquireIdempotencyKey(idempotencyKey, dealerId, { action: 'award', jobId, professionalId });
        if (idempotency.status === 'COMPLETED') {
            return;
        }

        try {
            const acceptanceDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            await jobService.awardJob(jobId, dealerId, professionalId, acceptanceDeadline);
            await dealerRepository.completeIdempotencyKey(idempotencyKey, { success: true });
        } catch (error) {
            await dealerRepository.failIdempotencyKey(idempotencyKey);
            throw error;
        }
    }

    /**
     * Cancel Job
     */
    async cancelJob(dealerId: string, jobId: string, reason: string, idempotencyKey: string): Promise<void> {
        const idempotency = await dealerRepository.acquireIdempotencyKey(idempotencyKey, dealerId, { action: 'cancel', jobId, reason });
        if (idempotency.status === 'COMPLETED') {
            return;
        }

        try {
            await jobService.cancelJob(jobId, dealerId, reason);
            await dealerRepository.completeIdempotencyKey(idempotencyKey, { success: true });
        } catch (error) {
            await dealerRepository.failIdempotencyKey(idempotencyKey);
            throw error;
        }
    }

    /**
     * Smart Matching Engine Endpoint
     * Orchestrates multiple data sources but returns recommendations without final authority
     */
    async getRecommendedInstallers(dealerId: string, jobId: string): Promise<any[]> {
        // 1. Fetch Job
        const job = await jobService.getJobById(jobId, dealerId, 'Client');
        if (!job || job.dealerId !== dealerId) {
            throw new Error('Unauthorized or Job not found');
        }

        // 2. Call the real matching service
        const { matchingService } = await import('../matching/matching.service');
        const recommendations = await matchingService.getSmartMatches(jobId, 10);
        
        // 3. Map to DTO, explicitly removing internal/raw PII if any
        return recommendations.map(rec => ({
            professionalId: rec.professionalId,
            matchScore: rec.matchScore,
            confidence: rec.confidence || 'Medium', // We need to add confidence to matchingService if it's missing from output
            scoreBreakdown: rec.scoreBreakdown,
            aiExplanation: rec.aiExplanation
        }));
    }
}

export const dealerService = new DealerService();
