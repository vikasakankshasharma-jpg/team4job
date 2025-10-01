
import type { DocumentReference, Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  anonymousId: string;
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
  installerProfile?: {
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    points: number;
    skills: string[];
    rating: number;
    reviews: number;
    verified: boolean;
    reputationHistory?: { month: string; points: number }[];
    aadharData?: {
      name: string;
      mobile: string;
      pincode: string;
    };
  };
};

export type FirestoreUser = Omit<User, 'memberSince'> & {
  memberSince: Timestamp;
};

export type Comment = {
  id: string;
  author: User | DocumentReference;
  timestamp: Date | Timestamp;
  content: string;
};

export type FirestoreComment = Omit<Comment, 'author' | 'timestamp'> & {
  author: DocumentReference;
  timestamp: Timestamp;
};

export type Bid = {
  id:string;
  installer: User | DocumentReference;
  amount: number;
  timestamp: Date | Timestamp;
  coverLetter?: string;
};

export type FirestoreBid = Omit<Bid, 'installer' | 'timestamp'> & {
    installer: DocumentReference;
    timestamp: Timestamp;
};


export type Job = {
  id: string;
  title: string;
  description: string;
  jobGiver: User | DocumentReference;
  location: string; // Pincode
  budget: {
    min: number;
    max: number;
  };
  status: 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed' | 'Cancelled';
  deadline: Date | Timestamp;
  jobStartDate?: Date | Timestamp;
  postedAt: Date | Timestamp;
  bids: Bid[];
  comments: Comment[];
  selectedInstallers?: { installerId: string, rank: number }[];
  awardedInstaller?: User['id'];
  rating?: number;
  completionOtp?: string;
};

export type FirestoreJob = Omit<Job, 'jobGiver' | 'deadline' | 'jobStartDate' | 'postedAt' | 'bids' | 'comments'> & {
    jobGiver: DocumentReference;
    deadline: Timestamp;
    jobStartDate?: Timestamp;
    postedAt: Timestamp;
    bids: FirestoreBid[];
    comments: FirestoreComment[];
}
