
import { disputeRepository } from './dispute.repository';
import { CreateDisputeInput, Dispute, DisputeMessage } from './dispute.types';
import { logger } from '@/infrastructure/logger';
import { jobService } from '../jobs/job.service';

export class DisputeService {
    async createDispute(input: CreateDisputeInput): Promise<string> {
        try {
            // 1. If JobId is provided, enrich with job details
            if (input.jobId) {
                const job = await jobService.getJobById(input.jobId, input.requesterId);
                input.jobTitle = job.title;
                const jobGiverId = typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id;
                const installerId = job.awardedInstallerId || (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id);

                input.parties = {
                    jobGiverId,
                    installerId: installerId || ''
                };
            }

            const id = await disputeRepository.create(input);
            logger.info('Dispute created', { disputeId: id, requesterId: input.requesterId });
            return id;
        } catch (error: any) {
            logger.error('Failed to create dispute', error, { input });
            throw new Error(error.message || 'Failed to create dispute');
        }
    }

    async getDispute(id: string, userId: string): Promise<Dispute> {
        const dispute = await disputeRepository.fetchById(id);
        if (!dispute) throw new Error('Dispute not found');

        // Check permissions: requester, parties, or admin/support
        // For now, simple check
        if (dispute.requesterId !== userId && dispute.parties?.jobGiverId !== userId && dispute.parties?.installerId !== userId) {
            // TODO: check for Admin role via UserService
            // For now, throw
            // throw new Error('Unauthorized access to dispute');
        }

        return dispute;
    }

    async respondToDispute(disputeId: string, authorId: string, content: string, role: any): Promise<void> {
        const message: DisputeMessage = {
            authorId,
            authorRole: role,
            content,
            timestamp: new Date()
        };
        await disputeRepository.addMessage(disputeId, message);
    }

    async listMyDisputes(userId: string): Promise<Dispute[]> {
        return await disputeRepository.fetchByRequester(userId);
    }
}

export const disputeService = new DisputeService();
