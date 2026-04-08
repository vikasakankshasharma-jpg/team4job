
import { DocumentReference, Timestamp } from "firebase/firestore";

export type Address = {
  house: string;
  street: string;
  landmark?: string;
  city?: string;
  cityPincode: string;
  fullAddress?: string;
};

export type UserStatus = 'active' | 'suspended' | 'deactivated';

export type PortfolioItem = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  minTierPriority?: number;
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
  addresses: {
    residence: Address;
    office?: Address;
    verified?: string; // Read-only, from Aadhar
  };
  district?: string; // Added for district-wise queries
  roles: ('Client' | 'Professional' | 'Admin' | 'Support Team')[];
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
  restrictedUntil?: Date | Timestamp; // 48-hour cooling period for sensitive changes
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
  favoriteProfessionalIds?: string[];
  blockedProfessionalIds?: string[];
  professionalTags?: { [professionalId: string]: string[] }; // Custom tags for organizing Professionals
  isFoundingProfessional?: boolean;
  professionalProfile?: {
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    points: number;
    tierPriority?: number;
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
  professional: User | DocumentReference;
  amount: number;
  timestamp: Date | Timestamp;
  coverLetter?: string;
  includedItems?: string[];
  warrantyDuration?: string;
  estimatedDuration?: number; // Phase 10
  durationUnit?: 'Hours' | 'Days'; // Phase 10
  professionalId?: string; // Added for Collection Group queries
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
  createdBy: 'Client' | 'Professional';
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
  client: User | DocumentReference;
  clientId?: string;
  location: string;
  fullAddress: string;
  address: Address;
  travelTip?: number;
  isGstInvoiceRequired: boolean;
  status: 'draft' | 'open' | 'bid_accepted' | 'funded' | 'in_progress' | 'work_submitted' | 'completed' | 'disputed' | 'cancelled' | 'unbid' | 'Open for Bidding' | 'Bidding Closed' | 'Awarded' | 'In Progress' | 'Completed' | 'Cancelled' | 'Unbid' | 'Pending Funding' | 'Pending Confirmation' | 'Disputed' | 'Needs Assistance' | 'Cancellation Proposed';
  deadline: Date | Timestamp;
  jobStartDate?: Date | Timestamp;
  isUrgent?: boolean;
  minTierPriority?: number; // Minimum reputation tier required to bid
  preferredTimeSlot?: 'Morning' | 'Afternoon' | 'Evening' | 'Weekend' | 'Any';
  priceEstimate?: { min: number; max: number };
  dateChangeProposal?: {
    newDate: Date | Timestamp;
    proposedBy: 'Client' | 'Professional';
    status: 'pending' | 'accepted' | 'rejected';
  };
  postedAt: Date | Timestamp;
  acceptanceDeadline?: Date | Timestamp;
  fundingDeadline?: Date | Timestamp;
  completionTimestamp?: Date | Timestamp;
  bids: Bid[];
  bidderIds?: string[];
  disqualifiedProfessionalIds?: string[];
  awardedProfessional?: User | DocumentReference;
  awardedProfessionalId?: string; // Added for redundancy and robust querying
  structuredRequirements?: Record<string, any>; // Stores raw answers from Fixed Question Flow (e.g. { device_count: "3-4", location: "shop" })
  // Language metadata for user content
  description_original?: {
    text: string;
    language: 'en' | 'hi' | 'hinglish';
  };
  description_compiled_en?: string | null; // AI-generated English version
  description_compiled_hi?: string | null; // (Future) AI-generated Hindi version
  selectedProfessionals?: { professionalId: string, rank: number }[];
  directAwardProfessionalId?: string; // ID of the Professional this job was directly sent to
  rating?: number;
  review?: string;
  clientReview?: {
    rating: number;
    review: string;
    createdAt: Date | Timestamp;
    authorId: string;
    authorName: string;
  };
  professionalReview?: {
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
    professionalName: string;
    professionalAddress: Address; // or string? strict Address type preferred
    gstin?: string;
    pan?: string;
  };
  comments: Comment[];
  privateMessages?: PrivateMessage[];
  cancellationProposer?: 'Client' | 'Professional';
  startOtp?: string; // Generated when funded, shared by Client
  workStartedAt?: Date | Timestamp; // Set when Professional verifies startOtp
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
    clientId: string;
    professionalId: string;
  };
  messages: DisputeMessage[];
  resolution?: string;
  createdAt: Date | Timestamp;
  resolvedAt?: Date | Timestamp;
  handledBy?: string; // Support Team member ID
};

export type Role = "Client" | "Professional" | "Admin" | "Support Team";

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  role: 'Client' | 'Professional' | 'Any';
  features: string[];
  isArchived: boolean;
};

export type Coupon = {
  code: string;
  description: string;
  planId: string;
  durationDays: number;
  applicableToRole: 'Professional' | 'Client' | 'Any';
  validFrom: Date | Timestamp;
  validUntil: Date | Timestamp;
  isActive: boolean;
};

export type BlacklistEntry = {
  id: string;
  type: 'user' | 'pincode';
  value: string;
  role: 'Any' | 'Professional' | 'Client';
  reason: string;
  createdAt: Date | Timestamp;
};

export type Transaction = {
  id: string; // Our internal ID
  jobId: string;
  jobTitle: string;
  payerId: string; // Client ID
  payeeId: string; // Professional ID
  amount: number; // The original bid amount
  travelTip?: number;
  commission: number; // The platform commission amount taken from Professional
  clientFee: number; // The fee charged to the client
  totalPaidByClient: number; // The total amount charged to the client (amount + clientFee + travelTip)
  payoutToProfessional: number; // The net amount paid out to the Professional (amount - commission + travelTip)
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
  description?: string;
};

export type PlatformSettings = {
  professionalCommissionRate?: number;
  categoryCommissionRates?: Record<string, number>;
  clientFeeRate?: number;
  defaultTrialPeriodDays: number;
  freeBidsForNewProfessionals: number;
  freePostsForNewClients: number;
  pointsForJobCompletion: number;
  pointsFor5StarRating: number;
  pointsFor4StarRating: number;
  penaltyFor1StarRating: number;
  penaltyForDeclinedJob: number;
  silverTierPoints: number;
  goldTierPoints: number;
  platinumTierPoints: number;
  minJobBudget: number;
  autoVerifyProfessionals: boolean;
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
  role?: 'Professional' | 'Client';
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
  | 'FAVORITE_PROFESSIONAL_BID'
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

export type AILog = {
  id: string;
  timestamp: Date | Timestamp;
  flowName: string;
  modelVersion: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
  totalTokenCount?: number;
  latencyMs: number;
  costUsd?: number; // Estimated cost
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  userFeedbackScore?: number; // 1-5
  cacheHit?: boolean;
};

export type AIMetric = {
  date: string; // YYYY-MM-DD
  totalCostUsd: number;
  totalRequests: number;
  averageLatencyMs: number;
  errorCount: number;
  cacheHitCount?: number;
};

export interface RateLimitConfig {
  enabled: boolean;
  limitType: 'global' | 'per_user'; // 'per_user' is what we mostly use
  quota: number; // Daily quota
  windowSeconds: number; // Usually 86400 for daily
  limitTypeAction?: 'ai_chat' | 'ai_bio' | 'ai_image' | 'ai_voice';
}

export interface AIFeedback {
  id?: string; // Optional because Firestore generates it
  traceId?: string; // Link to specific AI execution context
  flowName: string;
  userId: string;
  rating: 'positive' | 'negative';
  reason?: string; // Optional text feedback
  correction?: string; // Optional user-provided correction
  createdAt: any; // Timestamp
  metadata?: Record<string, any>; // Context (e.g., job scope inputs)
}

export interface UpdateProfileInput {
  name?: string;
  mobile?: string;
  address?: Address;
  pincodes?: {
    residential: string;
    office?: string;
  };
  professionalProfile?: Partial<User["professionalProfile"]>;
}

export interface ProfessionalFilters {
  skills?: string[];
  minRating?: number;
  verified?: boolean;
  pincode?: string;
}






