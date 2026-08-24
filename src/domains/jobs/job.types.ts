// domains/jobs/job.types.ts

import { DocumentReference, Timestamp } from 'firebase/firestore';
import { User, Address, Bid, Comment, PrivateMessage, JobAttachment, Milestone, AdditionalTask, Invoice } from '@/lib/types';

/**
 * Explicit Job Status - State Machine
 * This replaces the old string-based status
 */
export type JobStatus =
    | 'draft'                 // Job created but not posted
    | 'open'                  // Open for bidding
    | 'bid_accepted'          // Bid accepted, awaiting funding
    | 'funded'                // Funded and ready to start
    | 'in_progress'           // Work has started
    | 'work_submitted'        // Professional submitted work
    | 'completed'             // Job completed successfully
    | 'disputed'              // Under dispute
    | 'cancelled'             // Job cancelled
    | 'unbid'                 // Closed with no bids
    // Legacy support
    | 'Open for Bidding'
    | 'Bidding Closed'
    | 'Awarded'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled'
    | 'Unbid'
    | 'Pending Funding'
    | 'Pending Confirmation'
    | 'Disputed'
    | 'Needs Assistance'
    | 'Cancellation Proposed';

/**
 * Explicit Payment Status - Financial Lifecycle
 * Decoupled from JobStatus to handle complex financial states independently.
 */
export type JobPaymentStatus =
    | 'not_applicable'
    | 'payment_pending'
    | 'escrow_funded'
    | 'release_pending'
    | 'released'
    | 'refund_pending'
    | 'refunded'
    | 'disputed';

/**
 * Financial state machine transitions
 */
export const JOB_PAYMENT_STATE_TRANSITIONS: Partial<Record<JobPaymentStatus, JobPaymentStatus[]>> = {
    not_applicable: ['payment_pending'],
    payment_pending: ['escrow_funded', 'not_applicable'], // Could cancel job
    escrow_funded: ['release_pending', 'refund_pending', 'disputed'],
    release_pending: ['released', 'disputed'],
    released: ['refund_pending'], // Rare, post-release refund
    refund_pending: ['refunded', 'disputed'],
    disputed: ['release_pending', 'refund_pending', 'refunded', 'released'],
    refunded: [], // Terminal
};

/**
 * State machine transitions
 * Each status can only transition to specific next states
 */
export const JOB_STATE_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
    draft: ['open', 'cancelled'],
    open: ['bid_accepted', 'unbid', 'cancelled'],
    bid_accepted: ['funded', 'open', 'cancelled'], // Can reopen if funding fails
    funded: ['in_progress', 'In Progress', 'cancelled'],
    in_progress: ['work_submitted', 'Pending Confirmation', 'disputed', 'cancelled'],
    'In Progress': ['work_submitted', 'Pending Confirmation', 'disputed', 'cancelled'],
    work_submitted: ['completed', 'in_progress', 'disputed'], // Can go back if work rejected
    completed: ['disputed'], // Can dispute after completion
    disputed: ['in_progress', 'completed', 'cancelled'],
    unbid: ['open'], // Can reopen
    cancelled: [], // Terminal state
};

/**
 * Job type with new status field
 */
export interface Job {
    id: string;
    title: string;
    description: string;
    skills?: string[];
    jobCategory: string;

    // Actors (Legacy mapping: client == requester)
    client: User | DocumentReference;
    clientId: string;
    awardedProfessional?: User | DocumentReference;
    awardedProfessionalId?: string;

    // B2B & Context
    requesterType?: 'CUSTOMER' | 'DEALER';
    requesterId?: string; // Mirrors clientId
    dealerId?: string; // Used if requesterType === 'DEALER'
    
    // End Customer (The actual service beneficiary)
    endCustomerId?: string; // If they have an existing T4J account
    endCustomerContact?: {
        name: string;
        phone?: string;
        address?: Address; // For B2B, the location might differ from dealer's location
    };

    // Location (Service Location)
    location: string;
    fullAddress: string;
    address: Address;
    serviceLocationId?: string; // Deterministic hash of [ownerId + pincode + phone]

    // Pricing & Margins
    priceEstimate?: { min: number; max: number }; // Global visibility limit
    travelTip?: number;
    isGstInvoiceRequired: boolean;
    // B2B isolated financials
    dealerMargin?: number; 
    b2bPrice?: number;
    b2bCost?: number;

    // Status & Lifecycle
    status: JobStatus;
    paymentStatus?: JobPaymentStatus; // Financial state
    postedAt: Date | Timestamp;
    deadline: Date | Timestamp;
    jobStartDate?: Date | Timestamp;
    fundedAt?: Date | Timestamp;
    completionTimestamp?: Date | Timestamp;
    paymentReleasedAt?: Date | Timestamp;
    isUrgent?: boolean;
    minTierPriority?: number;
    dateChangeProposal?: {
        newDate: Date | Timestamp;
        proposedBy: 'Client' | 'Professional';
        status: 'pending' | 'accepted' | 'rejected';
    };

    // Bidding (DEPRECATED: Use /bids subcollection)
    /** @deprecated Use /bids subcollection */
    bids?: Bid[];
    bidderIds?: string[];
    disqualifiedProfessionalIds?: string[];
    acceptanceDeadline?: Date | Timestamp;
    fundingDeadline?: Date | Timestamp;

    // Work Progress
    startOtp?: string;
    workStartedAt?: Date | Timestamp;
    workSubmittedAt?: Date | Timestamp;
    completionOtp?: string;

    // Milestones & Tasks
    milestones?: Milestone[];
    additionalTasks?: AdditionalTask[];

    // Reviews
    clientReview?: {
        rating: number;
        review: string;
        createdAt: Date | Timestamp;
        authorId: string;
        authorName: string;
    };
    professionalReview?: {
        rating: number;
        review: string;
        createdAt: Date | Timestamp;
        authorId: string;
        authorName: string;
    };

    // Communication (DEPRECATED: Use /communications subcollection)
    /** @deprecated Use /communications subcollection */
    comments?: Comment[];
    /** @deprecated Use /communications subcollection */
    privateMessages?: PrivateMessage[];
    attachments?: JobAttachment[];

    // Billing
    invoice?: Invoice;
    billingSnapshot?: {
        professionalName: string;
        professionalAddress: Address;
        gstin?: string;
        pan?: string;
    };

    // Admin
    disputeId?: string;
    cancellationReason?: string;
    cancellationProposer?: 'Client' | 'Professional';
    archived?: boolean;
    adminNotes?: string;

    // Audit (DEPRECATED: Use /timeline subcollection)
    /** @deprecated Use /timeline subcollection via JobTimelineEvent */
    statusHistory?: {
        oldStatus: JobStatus | string;
        newStatus: JobStatus | string;
        timestamp: Date | Timestamp;
        changedBy: string;
        reason?: string;
    }[];

    // Testing
    isDummyData?: boolean;
}

/**
 * Job Timeline Event - Stored in /jobs/{jobId}/timeline
 */
export interface JobTimelineEvent {
    id: string;
    jobId: string;
    type: 'STATUS_CHANGE' | 'PAYMENT' | 'DISPUTE' | 'MILESTONE' | 'COMMUNICATION' | 'AUDIT';
    description: string;
    actorId: string;
    actorRole?: string;
    createdAt: Date | Timestamp;
    metadata?: Record<string, any>;

}

/**
 * Job creation input
 */
export interface CreateJobInput {
    title: string;
    description: string;
    skills?: string[];
    jobCategory: string;
    location: string;
    fullAddress: string;
    address: Address;
    
    // B2B & Context
    requesterType?: 'CUSTOMER' | 'DEALER';
    endCustomerId?: string;
    endCustomerContact?: {
        name: string;
        phone?: string;
        address?: Address;
    };

    priceEstimate?: { min: number; max: number };
    travelTip?: number;
    isGstInvoiceRequired: boolean;
    
    // B2B isolated financials
    dealerMargin?: number; 
    b2bPrice?: number;
    b2bCost?: number;
    
    deadline: Date;
    jobStartDate?: Date;
    isUrgent?: boolean;
    preferredTimeSlot?: 'Morning' | 'Afternoon' | 'Evening' | 'Weekend' | 'Any';
    attachments?: JobAttachment[];
    directAwardProfessionalId?: string;
}

/**
 * Job filters for browsing
 */
export interface JobFilters {
    jobCategory?: string;
    skills?: string[];
    minBudget?: number;
    maxBudget?: number;
    location?: string;
    pincode?: string;
    isUrgent?: boolean;
    postedAfter?: Date;
    status?: JobStatus[];
}

/**
 * Job statistics
 */
export interface JobStats {
    totalJobs: number;
    openJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    totalBids: number;
    totalSpent?: number;
    totalEarned?: number;
}

export interface ProfessionalStats {
    openJobs: number;
    myBids: number;
    jobsWon: number;
    activeJobs: number;
    completedJobs: number;
    projectedEarnings?: number;
    totalEarnings?: number;
}

export interface ClientStats {
    activeJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    totalBids: number;
    openDisputes: number;
}





