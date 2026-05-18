import { Case } from './case.types';
import { TRIAGE_WEIGHTS } from '@/lib/constants/triage-weights';
import { Timestamp } from 'firebase-admin/firestore';

export interface ScoreBreakdown {
  sla: number;
  amount: number;
  value: number;
  fraud: number;
  completeness: number;
}

export interface TriageScoreResult {
  scoreTotal: number;
  scoreBreakdown: ScoreBreakdown;
  scoreVersion: string;
  computedAt: Date;
}

export class TriageScoreService {
  private readonly SCORE_VERSION = 'v1.0.0';
  private readonly MAX_AMOUNT = 100000; // Normalize amount up to 100k INR

  public computeScore(caseData: Case): TriageScoreResult {
    // 1. SLA Proximity (0 to 1) - Closer to due date = higher score, breached = 1
    const nowMs = Date.now();
    const openedMs = caseData.openedAt instanceof Timestamp ? caseData.openedAt.toMillis() : caseData.openedAt.getTime();
    const dueMs = caseData.slaDueAt instanceof Timestamp ? caseData.slaDueAt.toMillis() : caseData.slaDueAt.getTime();
    
    let slaScore = 0;
    if (nowMs >= dueMs) {
      slaScore = 1; // Breached
    } else {
      const totalWindow = dueMs - openedMs;
      const elapsed = nowMs - openedMs;
      slaScore = totalWindow > 0 ? Math.max(0, Math.min(1, elapsed / totalWindow)) : 1;
    }

    // 2. Amount at Risk (0 to 1)
    const amountScore = Math.min(1, (caseData.amountAtRisk || 0) / this.MAX_AMOUNT);

    // 3. Customer Value (0 to 1) - Default to 0.5 for now, can be enriched via user service later
    const valueScore = 0.5;

    // 4. Fraud Likelihood (0 to 1)
    // riskScore is usually 0-100, normalize to 0-1
    const fraudScore = Math.min(1, (caseData.riskScore || 0) / 100);

    // 5. Data Completeness Penalty (0 to 1)
    let completeness = 0;
    if (caseData.description && caseData.description.length > 20) completeness += 0.5;
    if (caseData.linkedEntities && caseData.linkedEntities.length > 0) completeness += 0.5;
    // We want the penalty to reduce score, but the formula says `- e * Data_Completeness`
    // Actually, completeness means lower penalty. The formula is: - e * completeness, so we just use completeness as a multiplier.

    // Compute Weighted Parts
    const bSla = slaScore * TRIAGE_WEIGHTS.slaProximity;
    const bAmount = amountScore * TRIAGE_WEIGHTS.amountAtRisk;
    const bValue = valueScore * TRIAGE_WEIGHTS.customerValue;
    const bFraud = fraudScore * TRIAGE_WEIGHTS.fraudLikelihood;
    const bCompleteness = completeness * TRIAGE_WEIGHTS.dataCompletenessPenalty;

    const scoreTotal = bSla + bAmount + bValue + bFraud - bCompleteness;

    return {
      scoreTotal: Number(Math.max(0, scoreTotal).toFixed(4)),
      scoreBreakdown: {
        sla: Number(bSla.toFixed(4)),
        amount: Number(bAmount.toFixed(4)),
        value: Number(bValue.toFixed(4)),
        fraud: Number(bFraud.toFixed(4)),
        completeness: Number(bCompleteness.toFixed(4))
      },
      scoreVersion: this.SCORE_VERSION,
      computedAt: new Date()
    };
  }
}

export const triageScoreService = new TriageScoreService();
