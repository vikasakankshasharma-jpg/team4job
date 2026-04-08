
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
