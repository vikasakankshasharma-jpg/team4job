import { platformEventEmitter } from '@/lib/events/event-emitter';
import { PlatformEvent } from '@/lib/events/event-types';
import { caseService } from './case.service';
import { caseRepository } from './case.repository';

export async function disputeCaseEventHandler(event: PlatformEvent): Promise<void> {
  try {
    if (event.name === 'dispute.opened') {
      const { disputeId } = event.payload as { disputeId: string };
      if (disputeId) {
        await caseService.openCaseFromDispute(disputeId);
      }
    } else if (event.name === 'dispute.resolved') {
      const { disputeId, adminId, resolution } = event.payload as { disputeId: string; adminId: string; resolution?: string };
      if (disputeId) {
        // Find corresponding case
        const cases = await caseRepository.listAll();
        const linkedCase = cases.find(c =>
          c.linkedEntities.some(ent => ent.type === 'dispute' && ent.id === disputeId)
        );

        if (linkedCase && linkedCase.status !== 'closed') {
          // Transition to pending_review first or resolve directly
          // Let's mark as pending_review first as standard operational procedure
          await caseService.updateCaseStatus(
            linkedCase.id,
            'pending_review',
            {
              id: adminId || 'system',
              name: 'Resolver Admin',
              email: 'admin@team4job.com',
              role: 'compliance_manager' // Using a high-permission role for auto-transitions
            },
            resolution || 'Dispute resolved, auto-transitioning case.'
          );
        }
      }
    }
  } catch (error) {
    // Fail-safe to avoid blocking the main event flow
  }
}

// Register the subscription
platformEventEmitter.subscribe(disputeCaseEventHandler);
