import { caseRepository } from './case.repository';
import { Case, CreateCaseInput, CaseTimelineEntry, CaseApproval, CaseStatus, CasePriority, CaseSeverity, LinkedEntity } from './case.types';
import { logAdminAction } from '@/lib/admin-logger';
import { platformEventEmitter } from '@/lib/events/event-emitter';
import { checkAdminAccess, AdminRole, AdminAction } from '@/lib/security/rbac';
import { Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { disputeRepository } from '../disputes/dispute.repository';

export class CaseService {
  async openCase(input: CreateCaseInput, adminContext?: { id: string; name: string; email: string }): Promise<string> {
    const caseId = await caseRepository.create(input);

    const timelineEntry: CaseTimelineEntry = {
      id: randomUUID(),
      type: 'created',
      actorId: adminContext?.id || 'system',
      actorName: adminContext?.name || 'System',
      timestamp: new Date(),
      details: {
        title: input.title,
        type: input.type,
        priority: input.priority,
        severity: input.severity
      }
    };

    await caseRepository.appendTimelineEntry(caseId, timelineEntry);

    // Audit log
    if (adminContext) {
      await logAdminAction({
        adminId: adminContext.id,
        adminName: adminContext.name,
        adminEmail: adminContext.email,
        actionType: 'CASE_CREATED',
        targetType: 'case',
        targetId: caseId,
        details: { type: input.type, priority: input.priority }
      });
    }

    // Platform event
    platformEventEmitter.emit({
      name: 'case.opened' as any,
      occurredAt: new Date().toISOString(),
      payload: { caseId, type: input.type, priority: input.priority }
    });

    return caseId;
  }

  async getCaseById(id: string): Promise<Case | null> {
    return await caseRepository.fetchById(id);
  }

  async listCases(status?: CaseStatus): Promise<Case[]> {
    if (status) {
      return await caseRepository.listByStatus(status);
    }
    return await caseRepository.listAll();
  }

  async assignCase(
    caseId: string,
    adminId: string,
    adminName: string,
    actor: { id: string; name: string; email: string; role: AdminRole }
  ): Promise<void> {
    // RBAC check
    const rbacDecision = checkAdminAccess(actor.role, 'case.assign' as any);
    if (!rbacDecision.allowed) {
      throw new Error(`Unauthorized: ${rbacDecision.reason || 'RBAC permission required'}`);
    }

    const caseDoc = await caseRepository.fetchById(caseId);
    if (!caseDoc) throw new Error('Case not found');

    const prevOwner = caseDoc.ownerAdminId || 'none';
    await caseRepository.update(caseId, { ownerAdminId: adminId });

    const timelineEntry: CaseTimelineEntry = {
      id: randomUUID(),
      type: 'assigned',
      actorId: actor.id,
      actorName: actor.name,
      timestamp: new Date(),
      details: {
        assignedToId: adminId,
        assignedToName: adminName,
        previousOwnerId: prevOwner
      }
    };

    await caseRepository.appendTimelineEntry(caseId, timelineEntry);

    await logAdminAction({
      adminId: actor.id,
      adminName: actor.name,
      adminEmail: actor.email,
      actionType: 'ROLE_CHANGED', // Closest matching action log type
      targetType: 'case',
      targetId: caseId,
      details: { assignedToId: adminId, assignedToName: adminName }
    });
  }

  async updateCaseStatus(
    caseId: string,
    newStatus: CaseStatus,
    actor: { id: string; name: string; email: string; role: AdminRole },
    resolution?: string
  ): Promise<void> {
    // RBAC check
    const rbacDecision = checkAdminAccess(actor.role, 'case.resolve' as any);
    if (!rbacDecision.allowed) {
      throw new Error(`Unauthorized: ${rbacDecision.reason || 'RBAC permission required'}`);
    }

    const caseDoc = await caseRepository.fetchById(caseId);
    if (!caseDoc) throw new Error('Case not found');

    const prevStatus = caseDoc.status;
    const updates: Partial<Case> = { status: newStatus };
    
    if (newStatus === 'closed') {
      updates.closedAt = Timestamp.now() as any;
    }

    await caseRepository.update(caseId, updates);

    const timelineEntry: CaseTimelineEntry = {
      id: randomUUID(),
      type: 'status_changed',
      actorId: actor.id,
      actorName: actor.name,
      timestamp: new Date(),
      details: {
        previousStatus: prevStatus,
        newStatus,
        resolution
      }
    };

    await caseRepository.appendTimelineEntry(caseId, timelineEntry);

    if (newStatus === 'closed') {
      await logAdminAction({
        adminId: actor.id,
        adminName: actor.name,
        adminEmail: actor.email,
        actionType: 'CASE_CLOSED',
        targetType: 'case',
        targetId: caseId,
        details: { resolution }
      });

      platformEventEmitter.emit({
        name: 'case.closed' as any,
        occurredAt: new Date().toISOString(),
        payload: { caseId, resolution }
      });
    }
  }

  async addNote(
    caseId: string,
    note: string,
    actor: { id: string; name: string; email: string }
  ): Promise<void> {
    const timelineEntry: CaseTimelineEntry = {
      id: randomUUID(),
      type: 'note_added',
      actorId: actor.id,
      actorName: actor.name,
      timestamp: new Date(),
      details: { note }
    };

    await caseRepository.appendTimelineEntry(caseId, timelineEntry);
  }

  async requestApproval(
    caseId: string,
    reason: string,
    actor: { id: string; name: string; email: string }
  ): Promise<string> {
    const caseDoc = await caseRepository.fetchById(caseId);
    if (!caseDoc) throw new Error('Case not found');

    const approvalId = randomUUID();
    const approval: CaseApproval = {
      id: approvalId,
      requesterId: actor.id,
      requesterName: actor.name,
      reason,
      requestedAt: new Date()
    };

    await caseRepository.addApprovalRecord(caseId, approval);

    const timelineEntry: CaseTimelineEntry = {
      id: randomUUID(),
      type: 'approval_requested',
      actorId: actor.id,
      actorName: actor.name,
      timestamp: new Date(),
      details: { approvalId, reason }
    };

    await caseRepository.appendTimelineEntry(caseId, timelineEntry);

    platformEventEmitter.emit({
      name: 'case.approval_requested' as any,
      occurredAt: new Date().toISOString(),
      payload: { caseId, approvalId, requesterId: actor.id }
    });

    return approvalId;
  }

  async processApproval(
    caseId: string,
    approvalId: string,
    decision: 'approved' | 'rejected',
    actor: { id: string; name: string; email: string; role: AdminRole }
  ): Promise<void> {
    const caseDoc = await caseRepository.fetchById(caseId);
    if (!caseDoc) throw new Error('Case not found');

    const approval = caseDoc.approvals.find(a => a.id === approvalId);
    if (!approval) throw new Error('Approval request not found');

    if (approval.requesterId === actor.id) {
      throw new Error('Separation of Duties violated: Requester cannot approve their own request');
    }

    const rbacDecision = checkAdminAccess(actor.role, 'case.approve_high_risk' as any);
    if (!rbacDecision.allowed) {
      throw new Error(`Unauthorized: ${rbacDecision.reason || 'RBAC permission required'}`);
    }

    const now = new Date();
    await caseRepository.updateApprovalRecord(caseId, approvalId, {
      approverId: actor.id,
      approverName: actor.name,
      result: decision,
      decidedAt: now
    });

    const timelineEntry: CaseTimelineEntry = {
      id: randomUUID(),
      type: decision === 'approved' ? 'approved' : 'rejected',
      actorId: actor.id,
      actorName: actor.name,
      timestamp: now,
      details: { approvalId }
    };

    await caseRepository.appendTimelineEntry(caseId, timelineEntry);

    platformEventEmitter.emit({
      name: (decision === 'approved' ? 'case.approved' : 'case.rejected') as any,
      occurredAt: now.toISOString(),
      payload: { caseId, approvalId, approverId: actor.id }
    });
  }

  async openCaseFromDispute(disputeId: string): Promise<string> {
    const dispute = await disputeRepository.fetchById(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    // Check if case is already linked
    const existingCases = await caseRepository.listAll();
    const linkedCase = existingCases.find(c => 
      c.linkedEntities.some(ent => ent.type === 'dispute' && ent.id === disputeId)
    );

    if (linkedCase) {
      return linkedCase.id;
    }

    const linkedEntities: LinkedEntity[] = [{ type: 'dispute' as const, id: disputeId }];
    if (dispute.jobId) {
      linkedEntities.push({ type: 'job' as const, id: dispute.jobId });
    }

    return await this.openCase({
      type: 'dispute',
      priority: 'medium',
      severity: 'medium',
      slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48-hour default SLA
      linkedEntities,
      title: `Dispute Case: ${dispute.title}`,
      description: dispute.reason
    });
  }
}

export const caseService = new CaseService();
