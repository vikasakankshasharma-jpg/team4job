import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Case, CreateCaseInput, CaseTimelineEntry, CaseApproval } from './case.types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { applyEnvelope } from '@/lib/schema/schema-envelope';

export class CaseRepository {
  private get collection() {
    return getAdminDb().collection('cases');
  }

  async create(data: CreateCaseInput): Promise<string> {
    const caseData: Omit<Case, 'id'> = {
      type: data.type,
      status: 'open',
      priority: data.priority,
      severity: data.severity,
      ownerAdminId: data.ownerAdminId || undefined,
      watcherIds: [],
      slaDueAt: Timestamp.fromDate(data.slaDueAt),
      openedAt: Timestamp.now(),
      linkedEntities: data.linkedEntities,
      riskScore: data.riskScore ?? 0,
      amountAtRisk: data.amountAtRisk ?? 0,
      timeline: [],
      approvals: [],
      title: data.title,
      description: data.description,
      tenantId: 'team4job',
      schemaVersion: 1,
      region: 'IN',
      vertical: 'skilled_trades'
    };

    const docRef = await this.collection.add(applyEnvelope(caseData));
    return docRef.id;
  }

  async fetchById(id: string): Promise<Case | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Case;
  }

  async update(id: string, data: Partial<Case>): Promise<void> {
    await this.collection.doc(id).update(data);
  }

  async listAll(limitVal: number = 100): Promise<Case[]> {
    const snapshot = await this.collection.orderBy('openedAt', 'desc').limit(limitVal).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
  }

  async listByStatus(status: Case['status'], limitVal: number = 100): Promise<Case[]> {
    const snapshot = await this.collection
      .where('status', '==', status)
      .orderBy('openedAt', 'desc')
      .limit(limitVal)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
  }

  async listByOwner(adminId: string): Promise<Case[]> {
    const snapshot = await this.collection
      .where('ownerAdminId', '==', adminId)
      .orderBy('openedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
  }

  async listByPriority(priority: Case['priority']): Promise<Case[]> {
    const snapshot = await this.collection
      .where('priority', '==', priority)
      .orderBy('openedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
  }

  async listDueSoon(windowMs: number): Promise<Case[]> {
    const now = new Date();
    const futureLimit = new Date(now.getTime() + windowMs);

    const snapshot = await this.collection
      .where('status', '!=', 'closed')
      .where('slaDueAt', '<=', Timestamp.fromDate(futureLimit))
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
  }

  async appendTimelineEntry(caseId: string, entry: CaseTimelineEntry): Promise<void> {
    await this.collection.doc(caseId).update({
      timeline: FieldValue.arrayUnion(entry)
    });
  }

  async addApprovalRecord(caseId: string, approval: CaseApproval): Promise<void> {
    await this.collection.doc(caseId).update({
      approvals: FieldValue.arrayUnion(approval)
    });
  }

  async updateApprovalRecord(caseId: string, approvalId: string, updates: Partial<CaseApproval>): Promise<void> {
    const caseDoc = await this.fetchById(caseId);
    if (!caseDoc) throw new Error('Case not found');

    const updatedApprovals = caseDoc.approvals.map(approval => {
      if (approval.id === approvalId) {
        return { ...approval, ...updates };
      }
      return approval;
    });

    await this.collection.doc(caseId).update({
      approvals: updatedApprovals
    });
  }
}

export const caseRepository = new CaseRepository();
