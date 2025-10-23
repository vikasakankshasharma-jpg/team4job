
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
  status: UserStatus;
  suspensionEndDate?: Date | Timestamp;
  subscription?: {
    planId: string;
    planName: string;
    expiresAt: Date | Timestamp;
  };
  aadharNumber?: string;
  kycAddress?: string;
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
  id: string;
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
  id: string;
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

export type Job = {
  id:string;
  title: string;
  description: string;
  jobGiver: User | DocumentReference;
  location: string;
  fullAddress: string;
  address: Address;
  budget: {
    min: number;
    max: number;
  };
  status: 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed' | 'Cancelled' | 'Unbid';
  deadline: Date | Timestamp;
  jobStartDate?: Date | Timestamp;
  postedAt: Date | Timestamp;
  acceptanceDeadline?: Date | Timestamp;
  bids: Bid[];
  bidderIds?: string[];
  comments: Comment[];
  privateMessages?: PrivateMessage[];
  attachments?: JobAttachment[];
  awardedInstaller?: User | DocumentReference;
  rating?: number;
  completionOtp?: string;
  disputeId?: string;
  selectedInstallers?: { installerId: string, rank: number }[];
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
};

export type Role = "Job Giver" | "Installer" | "Admin" | "Support Team";

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  role: 'Job Giver' | 'Installer';
  features: string[];
  trialPeriodDays?: number;
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
  id: string;
  jobId: string;
  jobTitle: string;
  payerId: string;
  payerName: string;
  payeeId: string;
  payeeName: string;
  amount: number;
  status: 'Paid' | 'Failed' | 'Refunded';
  createdAt: Date | Timestamp;
  paidAt?: Date | Timestamp;
  failedAt?: Date | Timestamp;
  refundedAt?: Date | Timestamp;
};

    