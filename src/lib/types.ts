

export type User = {
  id: string;
  name: string;
  anonymousId: string;
  email: string;
  mobile: string;
  avatarUrl: string;
  realAvatarUrl: string;
  pincode: string;
  roles: ('Job Giver' | 'Installer')[];
  memberSince: Date;
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

export type Comment = {
  id: string;
  author: Pick<User, 'id' | 'name' | 'avatarUrl' | 'anonymousId' | 'memberSince'>;
  timestamp: Date;
  content: string;
};

export type Bid = {
  id:string;
  installer: User;
  amount: number;
  timestamp: Date;
  coverLetter?: string;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  jobGiver: Pick<User, 'id' | 'name' | 'avatarUrl' | 'anonymousId' | 'memberSince'>;
  location: string; // Pincode
  budget: {
    min: number;
    max: number;
  };
  status: 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed' | 'Cancelled';
  deadline: Date;
  jobStartDate?: Date;
  postedAt: Date;
  bids: Bid[];
  comments: Comment[];
  selectedInstallers?: { installerId: string, rank: number }[];
  awardedInstaller?: User['id'];
  rating?: number;
};
