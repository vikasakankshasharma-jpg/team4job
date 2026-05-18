import { TriageScoreService, triageScoreService } from '@/domains/cases/triage-score.service';
import { Case } from '@/domains/cases/case.types';
import { Timestamp } from 'firebase-admin/firestore';
import { TRIAGE_WEIGHTS } from '@/lib/constants/triage-weights';

describe('TriageScoreService', () => {
  it('computes max score for a critical breached case with high risk', () => {
    const now = Date.now();
    const mockCase: Partial<Case> = {
      openedAt: new Date(now - 10000), // opened 10s ago
      slaDueAt: new Date(now - 5000),  // breached 5s ago
      amountAtRisk: 100000,            // max amount
      riskScore: 100,                  // max fraud
      description: 'Long description to get data completeness bonus!',
      linkedEntities: [{ type: 'user', id: '123' }]
    };

    const result = triageScoreService.computeScore(mockCase as Case);
    
    // SLA = 1, Amount = 1, Value = 0.5 (default), Fraud = 1, Completeness = 1
    // Total = 0.35 + 0.25 + (0.5 * 0.15) + 0.20 - (1 * 0.05)
    // = 0.35 + 0.25 + 0.075 + 0.20 - 0.05 = 0.825
    expect(result.scoreTotal).toBe(0.825);
    expect(result.scoreBreakdown.sla).toBe(TRIAGE_WEIGHTS.slaProximity);
    expect(result.scoreBreakdown.amount).toBe(TRIAGE_WEIGHTS.amountAtRisk);
    expect(result.scoreBreakdown.fraud).toBe(TRIAGE_WEIGHTS.fraudLikelihood);
    expect(result.scoreBreakdown.completeness).toBe(TRIAGE_WEIGHTS.dataCompletenessPenalty);
  });

  it('computes a partial SLA score correctly', () => {
    const now = Date.now();
    // 50% elapsed SLA window
    const opened = now - 5000;
    const due = now + 5000;

    const mockCase: Partial<Case> = {
      openedAt: new Date(opened),
      slaDueAt: new Date(due),
      amountAtRisk: 0,
      riskScore: 0,
      description: '',
      linkedEntities: []
    };

    const result = triageScoreService.computeScore(mockCase as Case);
    
    // SLA = 0.5 (50% elapsed) -> 0.5 * 0.35 = 0.175
    // Amount = 0
    // Value = 0.5 * 0.15 = 0.075
    // Fraud = 0
    // Completeness = 0
    // Total = 0.175 + 0.075 = 0.25
    expect(result.scoreTotal).toBe(0.25);
    expect(result.scoreBreakdown.sla).toBe(0.175);
  });
  
  it('cap normalized values at 1', () => {
    const now = Date.now();
    const mockCase: Partial<Case> = {
      openedAt: new Date(now - 1000),
      slaDueAt: new Date(now + 1000),
      amountAtRisk: 500000, // Beyond max
      riskScore: 200,       // Beyond max
    };

    const result = triageScoreService.computeScore(mockCase as Case);
    expect(result.scoreBreakdown.amount).toBe(TRIAGE_WEIGHTS.amountAtRisk);
    expect(result.scoreBreakdown.fraud).toBe(TRIAGE_WEIGHTS.fraudLikelihood);
  });
});
