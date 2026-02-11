
export const JOB_STATUS = {
    DRAFT: 'draft',
    OPEN: 'open',
    BID_ACCEPTED: 'bid_accepted',
    FUNDED: 'funded',
    IN_PROGRESS: 'in_progress',
    WORK_SUBMITTED: 'work_submitted',
    COMPLETED: 'completed',
    DISPUTED: 'disputed',
    CANCELLED: 'cancelled',
    UNBID: 'unbid',
    // UI Display / Legacy compatibility
    OPEN_FOR_BIDDING: 'Open for Bidding',
    BIDDING_CLOSED: 'Bidding Closed',
    AWARDED: 'Awarded',
    PENDING_FUNDING: 'Pending Funding',
    PENDING_CONFIRMATION: 'Pending Confirmation',
    NEEDS_ASSISTANCE: 'Needs Assistance',
    CANCELLATION_PROPOSED: 'Cancellation Proposed'
} as const;

export const TRANSACTION_STATUS = {
    INITIATED: 'initiated',
    FUNDED: 'funded',
    RELEASED: 'released',
    REFUNDED: 'refunded',
    FAILED: 'failed',
    DISPUTED: 'disputed'
} as const;

export const DISPUTE_STATUS = {
    OPEN: 'Open',
    UNDER_REVIEW: 'Under Review',
    RESOLVED: 'Resolved'
} as const;

export const USER_ROLES = {
    ADMIN: 'Admin',
    INSTALLER: 'Installer',
    JOB_GIVER: 'Job Giver',
    SUPPORT_TEAM: 'Support Team'
} as const;

export const USER_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DEACTIVATED: 'deactivated'
} as const;
