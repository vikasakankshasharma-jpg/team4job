
export type ReputationTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface ReputationPointsHistory {
    month: string;
    points: number;
}

export interface DeductReputationInput {
    userId: string;
    points: number;
    reason: string;
    jobId?: string;
}

export interface ReputationUpdateResult {
    newPoints: number;
    newTier: ReputationTier;
    pointsGained: number;
}
export type ReputationEventType = 'JOB_COMPLETED' | 'RATING_RECEIVED' | 'DISPUTE_RAISED' | 'REFUND_PROCESSED' | 'MANUAL_ADJUSTMENT' | 'REVERSAL' | 'PENALTY';

export interface ReputationEvent {
    id: string; // Deterministic ID
    professionalId: string;
    jobId?: string;
    dealerId?: string;
    eventType: ReputationEventType;
    points: number;
    reason: string;
    jobValue?: number;
    createdAt: number;
}
export interface AwardReputationInput {
    userId: string;
    points: number;
    reason: string;
    eventType: ReputationEventType;
    jobId?: string;
    dealerId?: string;
    jobValue?: number;
}
