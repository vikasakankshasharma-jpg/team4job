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
    | 'work_submitted'        // Installer submitted work
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
 * State machine transitions
 * Each status can only transition to specific next states
 */
export const JOB_STATE_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
    draft: ['open', 'cancelled'],
    open: ['bid_accepted', 'unbid', 'cancelled'],
    bid_accepted: ['funded', 'open', 'cancelled'], // Can reopen if funding fails
    funded: ['in_progress', 'cancelled'],
    in_progress: ['work_submitted', 'disputed', 'cancelled'],
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

    // Actors
    jobGiver: User | DocumentReference;
    jobGiverId: string;
    awardedInstaller?: User | DocumentReference;
    awardedInstallerId?: string;

    // Location
    location: string;
    fullAddress: string;
    address: Address;

    // Pricing
    priceEstimate?: { min: number; max: number };
    travelTip?: number;
    isGstInvoiceRequired: boolean;

    // Status & Lifecycle
    status: JobStatus;
    postedAt: Date | Timestamp;
    deadline: Date | Timestamp;
    jobStartDate?: Date | Timestamp;
    completionTimestamp?: Date | Timestamp;
    paymentReleasedAt?: Date | Timestamp;
    isUrgent?: boolean;
    dateChangeProposal?: {
        newDate: Date | Timestamp;
        proposedBy: 'Job Giver' | 'Installer';
        status: 'pending' | 'accepted' | 'rejected';
    };

    // Bidding
    bids: Bid[];
    bidderIds?: string[];
    disqualifiedInstallerIds?: string[];
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
    jobGiverReview?: {
        rating: number;
        review: string;
        createdAt: Date | Timestamp;
        authorId: string;
        authorName: string;
    };
    installerReview?: {
        rating: number;
        review: string;
        createdAt: Date | Timestamp;
        authorId: string;
        authorName: string;
    };

    // Communication
    comments: Comment[];
    privateMessages?: PrivateMessage[];
    attachments?: JobAttachment[];

    // Billing
    invoice?: Invoice;
    billingSnapshot?: {
        installerName: string;
        installerAddress: Address;
        gstin?: string;
        pan?: string;
    };

    // Admin
    disputeId?: string;
    cancellationReason?: string;
    cancellationProposer?: 'Job Giver' | 'Installer';
    archived?: boolean;
    adminNotes?: string;

    // Audit
    statusHistory?: {
        oldStatus: JobStatus | string; // string for backward compatibility
        newStatus: JobStatus | string;
        timestamp: Date | Timestamp;
        changedBy: string;
        reason?: string;
    }[];

    // Testing
    isDummyData?: boolean;
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
    priceEstimate?: { min: number; max: number };
    travelTip?: number;
    isGstInvoiceRequired: boolean;
    deadline: Date;
    jobStartDate?: Date;
    isUrgent?: boolean;
    preferredTimeSlot?: 'Morning' | 'Afternoon' | 'Evening' | 'Weekend' | 'Any';
    attachments?: JobAttachment[];
    directAwardInstallerId?: string;
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

export interface InstallerStats {
    openJobs: number;
    myBids: number;
    jobsWon: number;
    activeJobs: number;
    completedJobs: number;
    projectedEarnings?: number;
    totalEarnings?: number;
}

export interface JobGiverStats {
    activeJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    totalBids: number;
    openDisputes: number;
}
