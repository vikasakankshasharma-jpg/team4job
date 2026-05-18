import { getAdminDb } from '@/infrastructure/firebase/admin';
import { caseRepository } from './case.repository';
import { triageScoreService } from './triage-score.service';
import { Case } from './case.types';
import { Timestamp } from 'firebase-admin/firestore';
import { applyEnvelope } from '@/lib/schema/schema-envelope';

export interface QueueItem {
  id: string;
  caseId: string;
  title: string;
  type: Case['type'];
  status: Case['status'];
  priority: Case['priority'];
  score: number;
  rank: number;
  slaDueAt: Timestamp | Date;
  ownerAdminId?: string;
  amountAtRisk: number;
  riskScore: number;
  breakdown: Record<string, number>;
  recomputedAt: Timestamp | Date;
}

export class CaseQueueRepository {
  private get queueCollection() {
    return getAdminDb().collection('case_queue');
  }

  async materializeQueue(): Promise<void> {
    const db = getAdminDb();
    
    // Get all open/active cases
    const cases = await caseRepository.listAll();
    const activeCases = cases.filter(c => c.status !== 'closed');

    // Calculate scores
    const items = activeCases.map(c => {
      const breakdown = triageScoreService.calculateScore(c);
      return {
        caseDoc: c,
        score: breakdown.totalScore,
        breakdown
      };
    });

    // Sort by score DESC
    items.sort((a, b) => b.score - a.score);

    // Batch write to case_queue collection
    const batch = db.batch();

    // 1. Delete all existing items in the case_queue
    const existingSnap = await this.queueCollection.get();
    existingSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 2. Add newly ranked items
    items.forEach((item, index) => {
      const queueItem: Omit<QueueItem, 'id'> = {
        caseId: item.caseDoc.id,
        title: item.caseDoc.title,
        type: item.caseDoc.type,
        status: item.caseDoc.status,
        priority: item.caseDoc.priority,
        score: item.score,
        rank: index + 1,
        slaDueAt: item.caseDoc.slaDueAt,
        ownerAdminId: item.caseDoc.ownerAdminId || undefined,
        amountAtRisk: item.caseDoc.amountAtRisk,
        riskScore: item.caseDoc.riskScore,
        breakdown: item.breakdown as any,
        recomputedAt: Timestamp.now()
      };
      
      const newDocRef = this.queueCollection.doc(item.caseDoc.id);
      batch.set(newDocRef, applyEnvelope(queueItem));
    });

    await batch.commit();
  }

  async getQueue(limitVal: number = 50): Promise<QueueItem[]> {
    const snapshot = await this.queueCollection
      .orderBy('score', 'desc')
      .limit(limitVal)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueueItem));
  }

  async claimNext(adminId: string, adminName: string): Promise<QueueItem | null> {
    const db = getAdminDb();
    
    // Find highest ranked case with NO owner
    const snapshot = await this.queueCollection
      .where('ownerAdminId', '==', null)
      .orderBy('score', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Retry without the where filter in JS since Firestore might be strict about null equality on dynamic fields
      const allQueue = await this.getQueue(100);
      const unowned = allQueue.find(item => !item.ownerAdminId);
      if (!unowned) return null;

      // Claim case in real case collection
      await caseRepository.update(unowned.caseId, { ownerAdminId: adminId });
      
      // Update case_queue item
      await this.queueCollection.doc(unowned.caseId).update({ ownerAdminId: adminId });
      
      // Return updated queue item
      return { ...unowned, ownerAdminId: adminId };
    }

    const doc = snapshot.docs[0];
    const item = { id: doc.id, ...doc.data() } as QueueItem;

    // Claim case in real case collection
    await caseRepository.update(item.caseId, { ownerAdminId: adminId });
    
    // Update case_queue item
    await doc.ref.update({ ownerAdminId: adminId });
    
    return { ...item, ownerAdminId: adminId };
  }
}

export const caseQueueRepository = new CaseQueueRepository();
