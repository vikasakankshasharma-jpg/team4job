

import { DocumentReference, Timestamp } from "firebase/firestore";

export type User = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  avatarUrl: string;
  realAvatarUrl: string;
  pincodes: {
    residential: string;
    office?: string;
  };
  roles: ('Job Giver' | 'Installer' | 'Admin')[];
  memberSince: Date | Timestamp;
  freeBids?: number;
  freeJobs?: number;
  creditsExpiry?: Date | Timestamp;
  aadharNumber?: string;
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
  id:string;
  installer: User | DocumentReference;
  amount: number;
  timestamp: Date | Timestamp;
  coverLetter?: string;
};

export type JobAttachment = {
  fileName: string;
  fileUrl: string; // This would be a Firebase Storage URL in a real app
  fileType: string;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  jobGiver: User | DocumentReference;
  location: string; // Pincode
  fullAddress?: string;
  budget: {
    min: number;
    max: number;
  };
  status: 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed' | 'Cancelled' | 'Unbid';
  deadline: Date | Timestamp;
  jobStartDate?: Date | Timestamp;
  postedAt: Date | Timestamp;
  bids: Bid[];
  bidderIds?: string[]; // New field for efficient queries
  comments: Comment[];
  privateMessages?: PrivateMessage[];
  attachments?: JobAttachment[];
  selectedInstallers?: { installerId: string, rank: number }[];
  awardedInstaller?: User['id'] | User | DocumentReference;
  rating?: number;
  completionOtp?: string;
  disputeId?: string;
};

export type DisputeAttachment = {
  fileName: string;
  fileUrl: string; // This would be a Firebase Storage URL in a real app
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

export type Role = "Job Giver" | "Installer" | "Admin";
    
