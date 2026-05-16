
import { disputeRepository } from './dispute.repository';
import { CreateDisputeInput, Dispute, DisputeMessage } from './dispute.types';

import { jobService } from '../jobs/job.service';
import { userRepository } from '../users/user.repository';
import { emailService } from '@/lib/email/email-service';
import { Role } from '@/lib/types';

export class DisputeService {
    async createDispute(input: CreateDisputeInput): Promise<string> {
        try {
            // 1. If JobId is provided, enrich with job details
            if (input.jobId) {
                const job = await jobService.getJobById(input.jobId, input.requesterId);
                input.jobTitle = job.title;
                const clientId = typeof job.client === 'string' ? job.client : job.client.id;
                const professionalId = job.awardedProfessionalId || (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id);

                input.parties = {
                    clientId,
                    professionalId: professionalId || ''
                };
            }

            const id = await disputeRepository.create(input);

            return id;
        } catch (error: any) {

            throw new Error(error.message || 'Failed to create dispute');
        }
    }

    async getDispute(id: string, userId: string, userRole?: Role): Promise<Dispute> {
        const dispute = await disputeRepository.fetchById(id);
        if (!dispute) throw new Error('Dispute not found');

        // Check permissions: requester, parties, or admin/support
        const isRequester = dispute.requesterId === userId;
        const isParty = dispute.parties?.clientId === userId || dispute.parties?.professionalId === userId;
        const isAdmin = userRole === 'Admin' || userRole === 'Support Team';

        if (!isRequester && !isParty && !isAdmin) {
            throw new Error('Unauthorized access to dispute');
        }

        return dispute;
    }

    async respondToDispute(
        disputeId: string,
        authorId: string,
        content: string,
        authorRole: Role,
        attachments: { fileName: string; fileUrl: string; fileType: string; }[] = []
    ): Promise<void> {
        const dispute = await disputeRepository.fetchById(disputeId);
        if (!dispute) throw new Error("Dispute not found");

        const message: DisputeMessage = {
            authorId,
            authorRole,
            content,
            timestamp: new Date(),
            attachments
        };
        await disputeRepository.addMessage(disputeId, message);

        // Notify other parties
        if (dispute.parties) {
            const recipientIds = [dispute.parties.clientId, dispute.parties.professionalId].filter(id => id !== authorId);
            await this.notifyParties(dispute, recipientIds, authorRole, content);
        }
    }

    async updateDisputeStatus(
        disputeId: string,
        adminId: string,
        newStatus: Dispute['status'],
        resolution?: string
    ): Promise<void> {
        const dispute = await disputeRepository.fetchById(disputeId);
        if (!dispute) throw new Error("Dispute not found");

        await disputeRepository.updateStatus(disputeId, newStatus, resolution);

        // Notify parties about the status update
        if (dispute.parties) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dodo-test.web.app';
            const partyIds = [dispute.parties.clientId, dispute.parties.professionalId];

            for (const pid of partyIds) {
                const pUser = await userRepository.fetchById(pid);
                if (pUser) {
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
    }

    private async notifyParties(dispute: Dispute, recipientIds: string[], authorRole: Role, content: string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dodo-test.web.app';
        const senderName = ['Support Team', 'Admin'].includes(authorRole) ? 'Support Team' : (authorRole === 'Client' ? 'Client' : 'Professional');

        for (const recipientId of recipientIds) {
            const recipient = await userRepository.fetchById(recipientId);
            if (recipient) {
                await emailService.sendNewMessageEmail({
                    to: recipient.email,
                    userName: recipient.name,
                    senderName,
                    jobTitle: dispute.jobTitle || 'Your Job',
                    messagePreview: content.substring(0, 100),
                    chatLink: `${baseUrl}/dashboard/disputes/${dispute.id}`
                });
            }
        }
    }

    async listMyDisputes(userId: string): Promise<Dispute[]> {
        return await disputeRepository.fetchByRequester(userId);
    }
}

export const disputeService = new DisputeService();
