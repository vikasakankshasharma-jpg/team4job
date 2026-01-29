
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
