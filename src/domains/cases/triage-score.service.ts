import { Case } from './case.types';
import { TRIAGE_WEIGHTS } from '@/lib/constants/triage-weights';

export interface ScoreBreakdown {
  slaProximityScore: number;
  amountAtRiskScore: number;
  customerValueScore: number;
  fraudLikelihoodScore: number;
  dataCompletenessPenaltyScore: number;
  totalScore: number;
}

export class TriageScoreService {
  calculateScore(caseDoc: Case): ScoreBreakdown {
    const { slaProximity, amountAtRisk, customerValue, fraudLikelihood, dataCompletenessPenalty } = TRIAGE_WEIGHTS;

    // 1. SLA Proximity (0 to 100)
    let slaProximityScore = 0;
    const now = Date.now();
    const dueTime = caseDoc.slaDueAt instanceof Date 
      ? caseDoc.slaDueAt.getTime() 
      : (caseDoc.slaDueAt?.toDate?.()?.getTime() || now);
    
    const remainingMs = dueTime - now;
    const remainingHours = remainingMs / (1000 * 60 * 60);

    if (remainingHours <= 0) {
      slaProximityScore = 100; // Breached
    } else if (remainingHours <= 24) {
      slaProximityScore = 100 - (remainingHours / 24) * 100; // Urgent
    } else if (remainingHours <= 72) {
      slaProximityScore = 50 - ((remainingHours - 24) / 48) * 50; // Medium SLA urgency
    } else {
      slaProximityScore = 10;
    }

    // 2. Amount At Risk (0 to 100, normalized to 100k INR max)
    const amountAtRiskScore = Math.min(caseDoc.amountAtRisk || 0, 100_000) / 1000;

    // 3. Customer Value (0 to 100)
    // Placeholder logic: default to 50 if unknown
    const customerValueScore = 50;

    // 4. Fraud Likelihood (0 to 100)
    const fraudLikelihoodScore = Math.min(caseDoc.riskScore || 0, 100);

    // 5. Data Completeness (0 to 100 penalty)
    let dataCompletenessScore = 100;
    if (!caseDoc.description) dataCompletenessScore -= 30;
    if (caseDoc.linkedEntities.length === 0) dataCompletenessScore -= 30;
    if (!caseDoc.title) dataCompletenessScore -= 20;
    
    const dataCompletenessPenaltyScore = 100 - dataCompletenessScore;

    // Weighted sum
    const totalScore = 
      (slaProximity * slaProximityScore) +
      (amountAtRisk * amountAtRiskScore) +
      (customerValue * customerValueScore) +
      (fraudLikelihood * fraudLikelihoodScore) -
      (dataCompletenessPenalty * dataCompletenessPenaltyScore);

    return {
      slaProximityScore,
      amountAtRiskScore,
      customerValueScore,
      fraudLikelihoodScore,
      dataCompletenessPenaltyScore,
      totalScore: parseFloat(totalScore.toFixed(2))
    };
  }
}

export const triageScoreService = new TriageScoreService();
