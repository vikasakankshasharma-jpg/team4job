import { getAdminDb } from '@/infrastructure/firebase/admin';
import { logAdminAction } from '@/lib/admin-logger';
import { platformEventEmitter } from '@/lib/events/event-emitter';
import { checkAdminAccess, AdminRole } from '@/lib/security/rbac';
import { Timestamp } from 'firebase-admin/firestore';
import { applyEnvelope, SchemaEnvelope } from '@/lib/schema/schema-envelope';
import { randomUUID } from 'crypto';

export interface ApprovalRequest extends SchemaEnvelope {
  id: string;
  actionType: 'refund.process' | 'payout.approve';
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'approved' | 'rejected';
  payload: Record<string, any>;
  requestedAt: Timestamp | Date;
  decidedAt?: Timestamp | Date;
  approverId?: string;
  approverName?: string;
  reason?: string;
}

export class ApprovalService {
  private get collection() {
    return getAdminDb().collection('approval_requests');
  }

  async requestAction(
    actionType: ApprovalRequest['actionType'],
    requester: { id: string; name: string },
    payload: Record<string, any>
  ): Promise<string> {
    const requestData: Omit<ApprovalRequest, 'id'> = {
      actionType,
      requesterId: requester.id,
      requesterName: requester.name,
      status: 'pending',
      payload,
      requestedAt: Timestamp.now(),
      tenantId: 'team4job',
      schemaVersion: 1,
      region: 'IN',
      vertical: 'skilled_trades'
    };

    const docRef = await this.collection.add(applyEnvelope(requestData));
    return docRef.id;
  }

  async submitDecision(
    requestId: string,
    approver: { id: string; name: string; email: string; role: AdminRole },
    decision: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    const doc = await this.collection.doc(requestId).get();
    if (!doc.exists) throw new Error('Approval request not found');

    const request = { id: doc.id, ...doc.data() } as ApprovalRequest;
    if (request.status !== 'pending') throw new Error('Request already processed');

    // 1. Separation of Duties check: Approver MUST NOT be the Requester
    if (request.requesterId === approver.id) {
      throw new Error('Separation of Duties violation: Action requester cannot approve their own request');
    }

    // 2. RBAC Permission Check
    const rbacDecision = checkAdminAccess(approver.role, request.actionType, {
      amountInr: request.payload.amount || 0
    });
    
    if (!rbacDecision.allowed) {
      throw new Error(`Unauthorized: Approver lacks RBAC permissions. Reason: ${rbacDecision.reason}`);
    }

    const now = new Date();
    await doc.ref.update({
      status: decision,
      approverId: approver.id,
      approverName: approver.name,
      decidedAt: Timestamp.fromDate(now),
      reason
    });

    // Write audit log
    await logAdminAction({
      adminId: approver.id,
      adminName: approver.name,
      adminEmail: approver.email,
      actionType: decision === 'approved' ? 'SETTINGS_CHANGED' : 'JOB_FLAGGED', // Best matching standard action type
      targetType: 'transaction',
      targetId: request.payload.transactionId || request.payload.jobId,
      details: { requestId, actionType: request.actionType, decision, reason },
      requiresDualControl: true,
      approvedBy: approver.id
    });

    // Emit event
    platformEventEmitter.emit({
      name: (decision === 'approved' ? 'case.approved' : 'case.rejected') as any,
      occurredAt: now.toISOString(),
      payload: { requestId, actionType: request.actionType, approverId: approver.id }
    });

    // Trigger action execution if approved
    if (decision === 'approved') {
      await this.executeAction(request.actionType, request.payload);
    }
  }

  private async executeAction(actionType: ApprovalRequest['actionType'], payload: Record<string, any>): Promise<void> {
    if (actionType === 'refund.process') {
      const { paymentService } = await import('../payments/payment.service');
      await paymentService.processRefund(payload.jobId, payload.reason || 'Approved refund');
    } else if (actionType === 'payout.approve') {
      const { paymentService } = await import('../payments/payment.service');
      await paymentService.releaseFunds(payload.jobId, payload.professionalId);
    }
  }

  async getPendingRequests(): Promise<ApprovalRequest[]> {
    const snapshot = await this.collection.where('status', '==', 'pending').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApprovalRequest));
  }
}

export const approvalService = new ApprovalService();
