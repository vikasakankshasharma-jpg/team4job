import { Timestamp } from 'firebase-admin/firestore';

export type JobEventType = 
    | 'JOB_CREATED'
    | 'JOB_MATCHING_STARTED'
    | 'INSTALLER_RECOMMENDED'
    | 'JOB_AWARDED'
    | 'JOB_STARTED'
    | 'JOB_COMPLETED'
    | 'PAYMENT_HELD_ESCROW'
    | 'PAYMENT_RELEASED'
    | 'JOB_DISPUTED';

export interface JobEvent {
    id: string;
    eventType: JobEventType;
    jobId: string;
    dealerId: string;
    actorId: string;
    timestamp: Date | Timestamp;
    
    // Point-in-time state captures
    b2bPrice?: number;
    dealerMargin?: number;
    installerId?: string;
    customerRef?: string;
}

export interface DealerOperationalKPIs {
    totalJobsCreated: number;
    jobsAwarded: number;
    jobsCompleted: number;
    jobsDisputed: number;
    
    matchToAwardRate: number; // %
    awardToCompletionRate: number; // %
    
    avgTimeToAwardHrs: number;
    avgTimeToCompletionHrs: number;
    avgPaymentReleaseHrs: number;
}

export interface DealerFinancialKPIs {
    totalRevenue: number;
    totalMargin: number;
    totalInstallerPayouts: number;
}
