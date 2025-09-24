export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  pincode: string;
  roles: ('Job Giver' | 'Installer')[];
  installerProfile?: {
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    points: number;
    skills: string[];
    jobsCompleted: number;
    rating: number;
    reviews: number;
    verified: boolean;
    reputationHistory?: { month: string; points: number }[];
  };
};

export type Comment = {
  id: string;
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  timestamp: Date;
  content: string;
};

export type Bid = {
  id: string;
  installer: User;
  amount: number;
  timestamp: Date;
  coverLetter: string;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  jobGiver: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  location: string; // Pincode
  budget: {
    min: number;
    max: number;
  };
  status: 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed';
  deadline: Date;
  postedAt: Date;
  bids: Bid[];
  comments: Comment[];
  selectedInstallers?: User['id'][];
  awardedInstaller?: User['id'];
};
