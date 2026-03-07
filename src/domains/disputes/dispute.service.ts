
import { disputeRepository } from './dispute.repository';
import { CreateDisputeInput, Dispute, DisputeMessage } from './dispute.types';
import { logger } from '@/infrastructure/logger';
import { jobService } from '../jobs/job.service';
import { Role } from '@/lib/types';

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

    async getDispute(id: string, userId: string, userRole?: Role): Promise<Dispute> {
        const dispute = await disputeRepository.fetchById(id);
        if (!dispute) throw new Error('Dispute not found');

        // Check permissions: requester, parties, or admin/support
        const isRequester = dispute.requesterId === userId;
        const isParty = dispute.parties?.jobGiverId === userId || dispute.parties?.installerId === userId;
        const isAdmin = userRole === 'Admin' || userRole === 'Support Team';

        if (!isRequester && !isParty && !isAdmin) {
            throw new Error('Unauthorized access to dispute');
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
