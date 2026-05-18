import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Case } from './case.types';
import { TriageScoreResult } from './triage-score.service';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface QueuedCase extends TriageScoreResult {
  id: string;
  caseId: string;
  status: Case['status'];
  priorityBucket: number; // 3: critical, 2: high, 1: medium, 0: low
  openedAt: Timestamp | Date;
  ownerAdminId?: string;
  claimedAt?: Timestamp | Date;
}

const PRIORITY_BUCKETS: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0
};

export class CaseQueueRepository {
  private get collection() {
    return getAdminDb().collection('case_queue');
  }

  async materializeQueue(cases: (Case & { scoreResult: TriageScoreResult })[]): Promise<void> {
    const db = getAdminDb();
    const batch = db.batch();

    for (const c of cases) {
      const docRef = this.collection.doc(c.id);
      const priorityBucket = PRIORITY_BUCKETS[c.priority] ?? 1;

      const queuedItem: QueuedCase = {
        id: c.id,
        caseId: c.id,
        status: c.status,
        priorityBucket,
        openedAt: c.openedAt,
        ownerAdminId: c.ownerAdminId,
        scoreTotal: c.scoreResult.scoreTotal,
        scoreBreakdown: c.scoreResult.scoreBreakdown,
        scoreVersion: c.scoreResult.scoreVersion,
        computedAt: c.scoreResult.computedAt
      };

      batch.set(docRef, queuedItem, { merge: true });
    }

    await batch.commit();
  }

  async claimNext(adminId: string, role: string, maxRetries = 3): Promise<QueuedCase | null> {
    const db = getAdminDb();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // 1. Query top unclaimed row(s)
      const snapshot = await this.collection
        .where('ownerAdminId', '==', null)
        .where('status', 'in', ['open', 'pending_review'])
        .orderBy('scoreTotal', 'desc')
        .orderBy('priorityBucket', 'desc')
        .orderBy('openedAt', 'asc')
        .orderBy('caseId', 'asc')
        .limit(3)
        .get();

      if (snapshot.empty) return null;

      // Try claiming the first one via Transaction
      for (const doc of snapshot.docs) {
        try {
          const claimedDoc = await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(doc.ref);
            if (!freshDoc.exists) return null;
            
            const data = freshDoc.data() as QueuedCase;
            // Compare and set
            if (data.ownerAdminId) return null; // Already claimed

            transaction.update(doc.ref, {
              ownerAdminId: adminId,
              claimedAt: FieldValue.serverTimestamp()
            });

            return { ...data, ownerAdminId: adminId, claimedAt: new Date() } as QueuedCase;
          });

          if (claimedDoc) {
            return claimedDoc; // Successfully claimed
          }
        } catch (e) {
          // Transaction failed (contention), will retry next doc or next outer loop
          continue;
        }
      }
      
      // If we got here, all 3 top docs were contended, retry the outer loop
    }
    
    throw new Error('Failed to claim case after max retries due to high contention');
  }

  async getQueue(limitVal = 50): Promise<QueuedCase[]> {
    const snapshot = await this.collection
      .where('status', 'in', ['open', 'pending_review'])
      .orderBy('scoreTotal', 'desc')
      .orderBy('priorityBucket', 'desc')
      .orderBy('openedAt', 'asc')
      .limit(limitVal)
      .get();
      
    return snapshot.docs.map(doc => doc.data() as QueuedCase);
  }
}

export const caseQueueRepository = new CaseQueueRepository();
