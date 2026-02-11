
import { DocumentReference, Timestamp } from "firebase/firestore";

export type Address = {
  house?: string;
  street?: string;
  landmark?: string;
  cityPincode: string;
  fullAddress?: string;
};

export type UserStatus = 'active' | 'suspended' | 'deactivated';

export type PortfolioItem = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  category: string;
  completedAt: Date | Timestamp;
};

export type User = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  avatarUrl: string;
  realAvatarUrl?: string;
  isMobileVerified?: boolean;
  isEmailVerified?: boolean;
  pincodes: {
    residential: string;
    office?: string;
  };
  address: Address;
  district?: string; // Added for district-wise queries
  roles: ('Job Giver' | 'Installer' | 'Admin' | 'Support Team')[];
  memberSince: Date | Timestamp;
  lastLoginAt?: Date | Timestamp;
  lastActiveAt?: Date | Timestamp; // For tracking inactivity
  status: UserStatus;
  suspensionEndDate?: Date | Timestamp;
  subscription?: {
    planId: string;
    planName: string;
    expiresAt: Date | Timestamp;
    status?: string;
    startDate?: Date | Timestamp;
    autoRenew?: boolean;
  };
  aadharLast4?: string;
  panNumber?: string;
  isPanVerified?: boolean;
  kycAddress?: string;
  gstin?: string;
  payouts?: {
    beneficiaryId?: string;
    accountHolderName?: string;
    accountNumberMasked?: string;
    ifsc?: string;
  };
  savedJobs?: string[]; // Array of Job IDs
  blockedUserIds?: string[]; // IDs of users blocked by this user
  blockedByUserIds?: string[]; // IDs of users who have blocked this user
  preferredLanguage?: 'en' | 'hi'; // User's preferred UI language
  fcmTokens?: string[];
  favoriteInstallerIds?: string[];
  blockedInstallerIds?: string[];
  installerTags?: { [installerId: string]: string[] }; // Custom tags for organizing installers
  isFoundingInstaller?: boolean;
  installerProfile?: {
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    points: number;
    skills: string[];
    rating: number;
    reviews: number;
    verified: boolean;
    verificationLevel?: 'Basic' | 'Pro';
    shopPhotoUrl?: string | null;
    gstNumber?: string | null;
    adminNotes?: string;
    reputationHistory?: { month: string; points: number }[];
    bio?: string;
    specialties?: string[];
    portfolio?: PortfolioItem[];
    availability?: {
      status: 'available' | 'busy' | 'on-vacation';
      nextAvailable?: Date | Timestamp;
    };
  };
  emergencyContacts?: {
    name: string;
    relation: string;
    mobile: string;
  }[];
  referredBy?: string;
  platformDebt?: number; // Amount owed to platform (e.g. from No-Show penalties)
  bookmarks?: string[]; // IDs of saved jobs
};

export type SavedSearch = {
  id: string;
  userId: string;
  name: string;
  criteria: {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    skills?: string[];
    location?: string;
  };
  alertFrequency: 'instant' | 'daily' | 'never';
  active: boolean;
  createdAt: any; // Using any to avoid Timestamp import issues in shared types, or use generic
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
  includedItems?: string[];
  warrantyDuration?: string;
  estimatedDuration?: number; // Phase 10
  durationUnit?: 'Hours' | 'Days'; // Phase 10
  installerId?: string; // Added for Collection Group queries
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

export type AdditionalTask = {
  id: string;
  description: string;
  status: 'pending-quote' | 'quoted' | 'approved' | 'declined' | 'funded';
  quoteAmount?: number;
  quoteDetails?: string;
  createdBy: 'Job Giver' | 'Installer';
  createdAt: Date | Timestamp;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'pending' | 'funded' | 'released'; // 'funded' means allocated from main escrow
  createdAt: number;
}

export type Job = {
  id: string;
  title: string;
  description: string;
  skills?: string[];
  jobCategory: string;
  jobGiver: User | DocumentReference;
  jobGiverId?: string;
  location: string;
  fullAddress: string;
  address: Address;
  travelTip?: number;
  isGstInvoiceRequired: boolean;
  status: 'draft' | 'open' | 'bid_accepted' | 'funded' | 'in_progress' | 'work_submitted' | 'completed' | 'disputed' | 'cancelled' | 'unbid' | 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed' | 'Cancelled' | 'Unbid' | 'Pending Funding' | 'Pending Confirmation' | 'Disputed' | 'Needs Assistance' | 'Cancellation Proposed';
  deadline: Date | Timestamp;
  jobStartDate?: Date | Timestamp;
  isUrgent?: boolean;
  priceEstimate?: { min: number; max: number };
  dateChangeProposal?: {
    newDate: Date | Timestamp;
    proposedBy: 'Job Giver' | 'Installer';
    status: 'pending' | 'accepted' | 'rejected';
  };
  postedAt: Date | Timestamp;
  acceptanceDeadline?: Date | Timestamp;
  fundingDeadline?: Date | Timestamp;
  completionTimestamp?: Date | Timestamp;
  bids: Bid[];
  bidderIds?: string[];
  disqualifiedInstallerIds?: string[];
  awardedInstaller?: User | DocumentReference;
  awardedInstallerId?: string; // Added for redundancy and robust querying
  structuredRequirements?: Record<string, any>; // Stores raw answers from Fixed Question Flow (e.g. { camera_count: "3-4", location: "shop" })
  // Language metadata for user content
  description_original?: {
    text: string;
    language: 'en' | 'hi' | 'hinglish';
  };
  description_compiled_en?: string | null; // AI-generated English version
  description_compiled_hi?: string | null; // (Future) AI-generated Hindi version
  selectedInstallers?: { installerId: string, rank: number }[];
  directAwardInstallerId?: string; // ID of the installer this job was directly sent to
  rating?: number;
  review?: string;
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
  workSubmittedAt?: Date | Timestamp; // For auto-release timer
  disputeId?: string;
  attachments?: JobAttachment[];
  invoice?: Invoice;
  additionalTasks?: AdditionalTask[];
  milestones?: Milestone[];
  billingSnapshot?: {
    installerName: string;
    installerAddress: Address; // or string? strict Address type preferred
    gstin?: string;
    pan?: string;
  };
  comments: Comment[];
  privateMessages?: PrivateMessage[];
  cancellationProposer?: 'Job Giver' | 'Installer';
  startOtp?: string; // Generated when funded, shared by Giver
  workStartedAt?: Date | Timestamp; // Set when Installer verifies startOtp
  completionOtp?: string;
  cancellationReason?: string;
  archived?: boolean;
  adminNotes?: string;
  statusHistory?: {
    oldStatus: string;
    newStatus: string;
    timestamp: Date | Timestamp;
    changedBy: string;  // User ID
    reason?: string;
  }[];
  isDummyData?: boolean;
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
  status: 'initiated' | 'funded' | 'released' | 'refunded' | 'failed' | 'disputed';
  paymentGatewayOrderId?: string;
  paymentGatewaySessionId?: string;
  payoutTransferId?: string;
  refundTransferId?: string;
  transactionType?: 'JOB' | 'SUBSCRIPTION';
  planId?: string;
  createdAt: Date | Timestamp;
  fundedAt?: Date | Timestamp;
  failedAt?: Date | Timestamp;
  releasedAt?: Date | Timestamp;
  refundedAt?: Date | Timestamp;
  relatedTaskId?: string; // Links this transaction to a specific AdditionalTask
};

export type PlatformSettings = {
  installerCommissionRate?: number;
  categoryCommissionRates?: Record<string, number>;
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
  minJobBudgetForMilestones: number; // Added for verification
};

export type JobCategoryTemplate = {
  id: string;
  name: string;
  includedItems: string[];
};

// Pending Signup Tracking
export type SignupStep = 1 | 2 | 3 | 4;

export type SignupStatus =
  | 'new'           // Just started, never contacted
  | 'contacted'     // Reached out at least once
  | 'follow_up'     // Need to contact again (scheduled)
  | 'busy'          // User asked to call back later
  | 'denied'        // User explicitly declined
  | 'converted';    // Completed signup

export type SignupPriority = 'high' | 'medium' | 'low';

export type DenialReason =
  | 'not_interested'
  | 'too_expensive'
  | 'found_alternative'
  | 'technical_issues'
  | 'trust_concerns'
  | 'other';

export type ContactOutcome =
  | 'answered'      // Talked to them
  | 'no_answer'     // Didn't pick up
  | 'busy'          // Asked to call later
  | 'voicemail'     // Left message
  | 'scheduled'     // Set follow-up appointment
  | 'denied';       // Said no

export interface ActivityLogEntry {
  id: string;
  timestamp: Date | Timestamp;
  adminId: string;
  adminName: string;
  action: 'call' | 'sms' | 'email' | 'note' | 'status_change';
  outcome?: ContactOutcome;
  notes: string;
  nextAction?: string;
  followUpScheduled?: Date | Timestamp;
}

export interface DenialInfo {
  denied: boolean;
  reason: DenialReason;
  customReason?: string;
  deniedAt: Date | Timestamp;
  deniedBy: string;
}

export type PendingSignup = {
  id: string;
  mobile: string; // PRIMARY - captured first
  email?: string; // Captured at Step 3
  name?: string; // From profile step
  role?: 'Installer' | 'Job Giver';
  currentStep: SignupStep; // Last completed step
  stepDetails: {
    step1: { completed: boolean; timestamp?: Date | Timestamp }; // Role selection
    step2: { completed: boolean; timestamp?: Date | Timestamp }; // KYC/Profile
    step3: { completed: boolean; timestamp?: Date | Timestamp }; // Email/Password
    step4: { completed: boolean; timestamp?: Date | Timestamp }; // Avatar
  };
  startedAt: Date | Timestamp;
  lastActiveAt: Date | Timestamp;
  attemptCount: number;
  dropoffReason?: 'timeout' | 'error' | 'manual_exit' | 'unknown';
  contacted: boolean;
  contactedAt?: Date | Timestamp;
  contactedBy?: string; // Admin user ID
  contactNotes?: string; // Admin notes about contact

  // NEW CRM FIELDS
  status: SignupStatus; // Current lead status
  priority: SignupPriority; // Lead priority
  followUpDate?: Date | Timestamp; // When to contact next
  denialInfo?: DenialInfo; // If denied, why?
  activityLog: ActivityLogEntry[]; // Full contact history
  totalContactAttempts: number; // Count of contact attempts
  lastContactedAt?: Date | Timestamp; // Last contact timestamp
  lastContactedBy?: string; // Last admin who contacted

  converted: boolean; // True when signup completes
  convertedAt?: Date | Timestamp;
  convertedUserId?: string; // Final user ID after successful signup
};

// --- Notifications ---

export type NotificationType =
  | 'NEW_BID'
  | 'BID_UPDATED'
  | 'FAVORITE_INSTALLER_BID'
  | 'FUNDING_DEADLINE_APPROACHING'
  | 'AWARD_DEADLINE_APPROACHING'
  | 'JOB_STARTED'
  | 'WORK_SUBMITTED'
  | 'MESSAGE_RECEIVED'
  | 'PAYMENT_RELEASED'
  | 'REVIEW_REQUESTED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: Date | Timestamp;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  frequency: 'realtime' | 'hourly_digest' | 'daily_digest';
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  categories: {
    bidding: { enabled: boolean; channels: string[] };
    payments: { enabled: boolean; channels: string[] };
    communication: { enabled: boolean; channels: string[] };
    deadlines: { enabled: boolean; channels: string[] };
  };
}

export interface Activity {
  id?: string;
  userId: string; // The user who sees this activity
  type: 'job_posted' | 'bid_placed' | 'bid_received' | 'job_awarded' | 'job_won' | 'job_completed' | 'payment_released' | 'payment_received' | 'dispute_opened' | 'new_message' | 'system_alert';
  title: string;
  description: string;
  timestamp: Date | Timestamp;
  link: string;
  metadata?: any;
  read: boolean;
  relatedId?: string; // Job ID, Transaction ID, etc.
}

export type BetaFeedback = {
  id: string;
  userId: string;
  userName?: string;
  role?: string;
  rating: number; // 1-5
  category: 'Feature Request' | 'Bug Report' | 'Improvement' | 'Other';
  message: string;
  createdAt: Date | Timestamp;
  status: 'new' | 'reviewed' | 'resolved';
  adminNotes?: string;
};
