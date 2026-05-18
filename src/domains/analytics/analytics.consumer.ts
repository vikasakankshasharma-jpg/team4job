import { platformEventEmitter } from '@/lib/events/event-emitter';
import { PlatformEvent } from '@/lib/events/event-types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function analyticsConsumer(event: PlatformEvent): Promise<void> {
  try {
    const db = getAdminDb();
    const todayStr = new Date().toISOString().split('T')[0];
    const metricRef = db.collection('daily_metrics').doc(todayStr);

    let incrementField = '';
    if (event.name === 'case.opened') {
      incrementField = 'casesOpened';
    } else if (event.name === 'case.closed') {
      incrementField = 'casesClosed';
    } else if (event.name === 'dispute.opened') {
      incrementField = 'disputesOpened';
    } else if (event.name === 'dispute.resolved') {
      incrementField = 'disputesResolved';
    }

    if (incrementField) {
      await metricRef.set({
        [incrementField]: FieldValue.increment(1),
        lastUpdatedAt: Timestamp.now()
      }, { merge: true });
    }
  } catch (error) {
    // Fail-safe background task
  }
}

// Register
platformEventEmitter.subscribe(analyticsConsumer);
