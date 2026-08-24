import { getAdminDb } from '@/infrastructure/firebase/admin';
import { JobEvent, JobEventType } from './timeline.types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

class TimelineService {
  private get db() {
    return getAdminDb();
  }

  /**
   * Records a job event immutably.
   * This should only be called from trusted server environments (Server Actions / APIs).
   * 
   * @param event The event payload
   * @param transaction Optional firestore transaction to ensure atomicity with business logic
   */
  async recordEvent(event: Omit<JobEvent, 'timestamp' | 'id'>, transaction?: FirebaseFirestore.Transaction): Promise<string> {
    const eventsRef = this.db.collection('job_events');
    
    // Check idempotency if a key is provided
    if (event.idempotencyKey) {
      // Note: In a transaction, we must do reads before writes.
      // If we are given a transaction, the caller should ideally handle idempotency,
      // but we can enforce it here if we do it early. 
      // For simplicity, we just use the idempotencyKey as the document ID if provided!
      const docId = event.idempotencyKey;
      const docRef = eventsRef.doc(docId);
      
      const payload = {
        ...event,
        timestamp: FieldValue.serverTimestamp(),
      };

      if (transaction) {
        transaction.create(docRef, payload);
      } else {
        try {
          await docRef.create(payload);
        } catch (e: any) {
          // ALREADY_EXISTS error means idempotency worked, ignore it.
          if (e.code === 6 || e.message.includes('ALREADY_EXISTS')) {
             console.log(`[Timeline] Idempotent event skipped: ${docId}`);
          } else {
             throw e;
          }
        }
      }
      return docId;
    } else {
      const docRef = eventsRef.doc();
      const payload = {
        ...event,
        timestamp: FieldValue.serverTimestamp(),
      };

      if (transaction) {
        transaction.set(docRef, payload);
      } else {
        await docRef.set(payload);
      }
      return docRef.id;
    }
  }

  /**
   * Retrieves the timeline for a job.
   * @param jobId 
   * @param limit Max events to fetch
   */
  async getJobTimeline(jobId: string, limitCount = 50): Promise<JobEvent[]> {
    const snapshot = await this.db.collection('job_events')
      .where('jobId', '==', jobId)
      .orderBy('timestamp', 'asc')
      .limit(limitCount)
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JobEvent[];
  }
}

export const timelineService = new TimelineService();
