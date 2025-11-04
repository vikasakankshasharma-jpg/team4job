
import { DocumentReference, Timestamp } from "firebase/firestore";

export type Address = {
  house?: string;
  street?: string;
  landmark?: string;
  cityPincode: string; 
  fullAddress?: string;
};

export type UserStatus = 'active' | 'suspended' | 'deactivated';

export type User = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  avatarUrl: string;
  realAvatarUrl?: string;
  pincodes: {
    residential: string;
    office?: string;
  };
  address: Address;
  roles: ('Job Giver' | 'Installer' | 'Admin' | 'Support Team')[];
  memberSince: Date | Timestamp;
  lastLoginAt?: Date | Timestamp;
  status: UserStatus;
  suspensionEndDate?: Date | Timestamp;
  subscription?: {
    planId: string;
    planName: string;
    expiresAt: Date | Timestamp;
  };
  aadharNumber?: string;
  kycAddress?: string;
  gstin?: string;
  payouts?: {
    beneficiaryId?: string;
    accountHolderName?: string;
    accountNumberMasked?: string;
    ifsc?: string;
  };
  fcmTokens?: string[];
  favoriteInstallerIds?: string[];
  blockedInstallerIds?: string[];
  installerProfile?: {
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    points: number;
    skills: string[];
    rating: number;
    reviews: number;
    verified: boolean;
    reputationHistory?: { month: string; points: number }[];
  };
};

export type Comment = {
  id?: string;
  author: User | DocumentReference;
  timestamp: Date | Timestamp;
  content: string;
};

export type PrivateMessage = {
  id: string;
  author: User | DocumentReference;
  timestamp: Date | Timestamp;
  content: string;
  attachments?: JobAttachment[];
};

export type Bid = {
  id?: string;
  installer: User | DocumentReference;
  amount: number;
  timestamp: Date | Timestamp;
  coverLetter?: string;
};

export type JobAttachment = {
  fileName: string;
  fileUrl: string;
  fileType: string;
};

export type Invoice = {
  id: string;
  jobId: string;
  jobTitle: string;
  date: Date | Timestamp;
  subtotal: number;
  travelTip: number;
  totalAmount: number;
  from: {
    name: string;
    gstin: string;
  };
  to: {
    name: string;
    gstin: string;
  };
}

export type Job = {
  id:string;
  title: string;
  description: string;
  skills?: string[];
  jobGiver: User | DocumentReference;
  location: string;
  fullAddress: string;
  address: Address;
  budget: {
    min: number;
    max: number;
  };
  travelTip?: number;
  isGstInvoiceRequired: boolean;
  status: 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed' | 'Cancelled' | 'Unbid' | 'Pending Funding' | 'Disputed';
  deadline: Date | Timestamp;
  jobStartDate?: Date | Timestamp;
  dateChangeProposal?: {
    newDate: Date | Timestamp;
    proposedBy: 'Job Giver' | 'Installer';
    status: 'pending' | 'accepted' | 'rejected';
  };
  postedAt: Date | Timestamp;
  acceptanceDeadline?: Date | Timestamp;
  fundingDeadline?: Date | Timestamp;
  bids: Bid[];
  bidderIds?: string[];
  disqualifiedInstallerIds?: string[];
  awardedInstaller?: User | DocumentReference;
  selectedInstallers?: { installerId: string, rank: number }[];
  rating?: number;
  review?: string;
  completionOtp?: string;
  disputeId?: string;
  attachments?: JobAttachment[];
  invoice?: Invoice;
  comments: Comment[];
  privateMessages?: PrivateMessage[];
};

export type DisputeAttachment = {
  fileName: string;
  fileUrl: string;
  fileType: string;
};

export type DisputeMessage = {
  authorId: string;
  authorRole: Role;
  content: string;
  timestamp: Date | Timestamp;
  attachments?: DisputeAttachment[];
}

export type Dispute = {
    id: string;
    requesterId: string;
    category: "Job Dispute" | "Billing Inquiry" | "Technical Support" | "Skill Request" | "General Question";
    title: string;
    jobId?: string;
    jobTitle?: string;
    status: 'Open' | 'Under Review' | 'Resolved';
    reason: string;
    parties?: {
        jobGiverId: string;
        installerId: string;
    };
    messages: DisputeMessage[];
    resolution?: string;
    createdAt: Date | Timestamp;
    resolvedAt?: Date | Timestamp;
    handledBy?: string; // Support Team member ID
};

export type Role = "Job Giver" | "Installer" | "Admin" | "Support Team";

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  role: 'Job Giver' | 'Installer' | 'Any';
  features: string[];
  isArchived: boolean;
};

export type Coupon = {
  code: string;
  description: string;
  planId: string;
  durationDays: number;
  applicableToRole: 'Installer' | 'Job Giver' | 'Any';
  validFrom: Date | Timestamp;
  validUntil: Date | Timestamp;
  isActive: boolean;
};

export type BlacklistEntry = {
    id: string;
    type: 'user' | 'pincode';
    value: string;
    role: 'Any' | 'Installer' | 'Job Giver';
    reason: string;
    createdAt: Date | Timestamp;
};

export type Transaction = {
  id: string; // Our internal ID
  jobId: string;
  jobTitle: string;
  payerId: string; // Job Giver ID
  payeeId: string; // Installer ID
  amount: number; // The original bid amount
  travelTip?: number;
  commission: number; // The platform commission amount taken from installer
  jobGiverFee: number; // The fee charged to the job giver
  totalPaidByGiver: number; // The total amount charged to the job giver (amount + jobGiverFee + travelTip)
  payoutToInstaller: number; // The net amount paid out to the installer (amount - commission + travelTip)
  status: 'Initiated' | 'Funded' | 'Failed' | 'Released' | 'Refunded' | 'Disputed';
  paymentGatewayOrderId?: string;
  paymentGatewaySessionId?: string;
  payoutTransferId?: string;
  refundTransferId?: string;
  createdAt: Date | Timestamp;
  fundedAt?: Date | Timestamp;
  failedAt?: Date | Timestamp;
  releasedAt?: Date | Timestamp;
  refundedAt?: Date | Timestamp;
};

export type PlatformSettings = {
    installerCommissionRate?: number;
    jobGiverFeeRate?: number;
    defaultTrialPeriodDays: number;
    freeBidsForNewInstallers: number;
    freePostsForNewJobGivers: number;
    pointsForJobCompletion: number;
    pointsFor5StarRating: number;
    pointsFor4StarRating: number;
    penaltyFor1StarRating: number;
    penaltyForDeclinedJob: number;
    silverTierPoints: number;
    goldTierPoints: number;
    platinumTierPoints: number;
    minJobBudget: number;
    autoVerifyInstallers: boolean;
};
