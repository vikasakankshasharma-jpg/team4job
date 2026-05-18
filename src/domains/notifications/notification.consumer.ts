import { platformEventEmitter } from '@/lib/events/event-emitter';
import { PlatformEvent } from '@/lib/events/event-types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function notificationConsumer(event: PlatformEvent): Promise<void> {
  try {
    const db = getAdminDb();

    let notificationData: any = null;

    if (event.name === 'case.approval_requested') {
      const payload = event.payload as { caseId: string; requesterId: string };
      notificationData = {
        title: 'Bypass Approval Requested',
        message: `Case ${payload.caseId.substring(0,8)} requires a secondary dual-control approval bypass signoff.`,
        type: 'FINOPS_APPROVAL_REQUEST',
        priority: 'high',
        userId: 'admin_broadcast' // Handled by admin panel triggers
      };
    } else if (event.name === 'case.approved') {
      const payload = event.payload as { requestId: string; actionType: string };
      notificationData = {
        title: 'Bypass Overrides Approved',
        message: `Dual-control override action "${payload.actionType}" was authorized and executed.`,
        type: 'FINOPS_APPROVAL_GRANTED',
        priority: 'high',
        userId: 'admin_broadcast'
      };
    } else if (event.name === 'case.rejected') {
      const payload = event.payload as { requestId: string; actionType: string };
      notificationData = {
        title: 'Bypass Overrides Rejected',
        message: `Dual-control override request for "${payload.actionType}" was rejected.`,
        type: 'FINOPS_APPROVAL_DENIED',
        priority: 'high',
        userId: 'admin_broadcast'
      };
    }

    if (notificationData) {
      await db.collection('notifications').add({
        ...notificationData,
        createdAt: Timestamp.now(),
        read: false
      });
    }
  } catch (error) {
    // Fail-safe background task
  }
}

// Register
platformEventEmitter.subscribe(notificationConsumer);
