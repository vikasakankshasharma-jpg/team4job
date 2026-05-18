import { caseRepository } from '@/domains/cases/case.repository';
import { logAdminAlert } from '@/lib/admin-logger';

export class SlaMonitor {
  async checkSlaBreaches(warningWindowMs: number = 4 * 60 * 60 * 1000): Promise<void> {
    try {
      const casesDue = await caseRepository.listDueSoon(warningWindowMs);
      const now = Date.now();

      for (const caseDoc of casesDue) {
        const dueTime = caseDoc.slaDueAt instanceof Date
          ? caseDoc.slaDueAt.getTime()
          : (caseDoc.slaDueAt?.toDate?.()?.getTime() || now);

        const remainingMs = dueTime - now;

        if (remainingMs <= 0) {
          // Hard breach
          await logAdminAlert(
            'CRITICAL',
            `SLA BREACHED: Case "${caseDoc.title}" is overdue.`,
            { caseId: caseDoc.id, type: 'sla_breach' }
          );
        } else if (remainingMs <= warningWindowMs) {
          // Warning threshold crossed
          const remainingHours = Math.round(remainingMs / (1000 * 60 * 60));
          await logAdminAlert(
            'WARNING',
            `SLA WARNING: Case "${caseDoc.title}" is due in ${remainingHours} hours.`,
            { caseId: caseDoc.id, type: 'sla_warning' }
          );
        }
      }
    } catch (error) {
      // Prevent throwing inside background tasks
    }
  }
}

export const slaMonitor = new SlaMonitor();
