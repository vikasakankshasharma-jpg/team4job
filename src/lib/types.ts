

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

export type Bid = {
  id:string;
  installer: User | DocumentReference;
  amount: number;
  timestamp: Date | Timestamp;
  coverLetter?: string;
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
  comments: Comment[];
  selectedInstallers?: { installerId: string, rank: number }[];
  awardedInstaller?: User['id'] | User | DocumentReference;
  rating?: number;
  completionOtp?: string;
  disputeId?: string;
};

export type DisputeMessage = {
  authorId: string;
  authorRole: Role;
  content: string;
  timestamp: Date | Timestamp;
}

export type Dispute = {
    id: string;
    jobId: string;
    jobTitle: string;
    status: 'Open' | 'Under Review' | 'Resolved';
    reason: string;
    parties: {
        jobGiverId: string;
        installerId: string;
    };
    messages: DisputeMessage[];
    resolution?: string;
    createdAt: Date | Timestamp;
    resolvedAt?: Date | Timestamp;
};

export type Role = "Job Giver" | "Installer" | "Admin";
    
