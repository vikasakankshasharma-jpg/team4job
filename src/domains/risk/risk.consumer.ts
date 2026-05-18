import { platformEventEmitter } from '@/lib/events/event-emitter';
import { PlatformEvent } from '@/lib/events/event-types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { caseService } from '../cases/case.service';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function riskConsumer(event: PlatformEvent): Promise<void> {
  try {
    const db = getAdminDb();
    let targetUserId = '';
    let riskPoints = 0;
    let reason = '';

    if (event.name === 'dispute.opened') {
      const payload = event.payload as { professionalId?: string; clientId?: string };
      targetUserId = payload.professionalId || payload.clientId || '';
      riskPoints = 15;
      reason = 'Involvement in opened dispute incident';
    } else if (event.name === 'user.flagged') {
      const payload = event.payload as { userId: string; reason?: string };
      targetUserId = payload.userId;
      riskPoints = 30;
      reason = payload.reason || 'User flagged by system standard filters';
    }

    if (targetUserId && riskPoints > 0) {
      const userRef = db.collection('users').doc(targetUserId);
      
      // Atomically increment user's riskScore
      await userRef.set({
        riskScore: FieldValue.increment(riskPoints),
        lastRiskEvaluationAt: Timestamp.now()
      }, { merge: true });

      // Retrieve updated user profile to check thresholds
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        if (!userData) return;
        const currentRisk = userData.riskScore || 0;

        // Auto-escalation threshold rule (if risk >= 75)
        if (currentRisk >= 75 && !userData.autoCaseTriggered) {
          // Open high-priority investigation case
          await caseService.openCase({
            type: 'compliance',
            priority: 'high',
            severity: 'high',
            slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours SLA
            linkedEntities: [{ type: 'user', id: targetUserId }],
            riskScore: currentRisk,
            amountAtRisk: 0,
            title: 'Critical Risk Threshold Crossed',
            description: `User ${userData.name || targetUserId} has accumulated a critical risk score of ${currentRisk} points. Reason for last update: ${reason}.`
          });

          // Prevent trigger loop
          await userRef.update({ autoCaseTriggered: true });
        }
      }
    }
  } catch (error) {
    // Fail-safe background task
  }
}

// Register
platformEventEmitter.subscribe(riskConsumer);
