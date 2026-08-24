import { getAdminDb } from '@/infrastructure/firebase/admin';
import { JobEvent, JobEventType } from './analytics.types';
import * as admin from 'firebase-admin';

export class EventLedgerService {
    private get db() {
        return getAdminDb();
    }

    /**
     * Appends an immutable event to the job_events collection.
     */
    async logEvent(payload: Omit<JobEvent, 'id' | 'timestamp'>): Promise<string> {
        if (!payload.dealerId) throw new Error("dealerId is required for analytics tracking");

        const ref = this.db.collection('job_events').doc();
        await ref.set({
            ...payload,
            id: ref.id,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
    }
}

export const eventLedgerService = new EventLedgerService();
