import { Timestamp } from 'firebase-admin/firestore';

export type UntrustedImportRow = Record<string, any>;

export interface ValidatedImportRow {
    jobExternalRef?: string;
    title: string;
    description: string;
    category: string;
    scheduledDate: Date;
    
    customerExternalRef?: string;
    customerName?: string;
    customerPhone?: string;
    
    siteExternalRef?: string;
    siteName?: string;
    siteAddress?: string;
}

export type ResolutionStatus = 'EXISTING' | 'NEW' | 'NEEDS_REVIEW' | 'INVALID';

export interface StagedImportRow extends ValidatedImportRow {
    id: string; // Row ID within the batch
    
    customerResolutionStatus: ResolutionStatus;
    resolvedCustomerId?: string;
    
    siteResolutionStatus: ResolutionStatus;
    resolvedSiteId?: string;

    isDuplicate: boolean;
    duplicateReason?: string;
    
    validationErrors: string[];
    isReadyForCommit: boolean;
}

export interface CommitCommand {
    dealerId: string;
    batchId: string;
    rowId: string;

    // Customer creation if NEW
    customerToCreate?: {
        name: string;
        phone: string;
    };
    customerIdToUse?: string; // If EXISTING

    // Site creation if NEW
    siteToCreate?: {
        name: string;
        fullAddress: string;
    };
    siteIdToUse?: string; // If EXISTING

    // Job Template (Always DRAFT)
    jobTemplate: {
        title: string;
        description: string;
        jobCategory: string;
        scheduledDate: Date;
        jobExternalRef?: string;
    };
}

export interface ImportBatch {
    id: string; // batchId
    dealerId: string;
    uploadedBy: string;
    fileName: string;
    
    rowCount: number;
    validCount: number;
    rejectedCount: number;
    duplicateCount: number;
    
    status: 'STAGED' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
    
    createdAt: Date | Timestamp;
    confirmedAt?: Date | Timestamp;
    completedAt?: Date | Timestamp;
}
