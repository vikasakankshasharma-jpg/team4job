
# MASTER PROMPT: CCTV Job Connect PWA (v2.0)

This document serves as the master prompt and detailed specification for building and extending the "CCTV Job Connect" Progressive Web App (PWA). This is a living document reflecting the platform's complete architecture as of the latest update.

## 1. High-Level App Concept

**App Name:** CCTV Job Connect

**Core Purpose:** A sophisticated, AI-enhanced marketplace connecting "Job Givers" (clients) with verified, skilled "Installers" for CCTV installation and maintenance services. The platform is architected around a subscription model to support professional users and ensure sustainable revenue.

**Target Audience:**
*   **Job Givers:** Homeowners, business owners, and property managers needing CCTV services. This includes both non-technical novices and high-volume "Pro" users who manage multiple properties.
*   **Installers:** Vetted, professional CCTV and security system installers seeking employment opportunities, from individual contractors to small businesses.

---

## 2. Core Features & Business Logic

### User & Subscription System
*   **Dual Roles & Role Switching:** Users can sign up as a "Job Giver" or "Installer". A user can hold both roles and instantly switch between modes from their profile menu without logging out.
*   **Subscription Model:** The platform operates on a freemium model. New users receive a trial or a basic plan. Access to premium features (e.g., browsing the Installer Directory, lower commission rates) requires an active paid subscription.
*   **Billing Management:** A dedicated "Billing" page where users can view their current plan, upgrade their subscription via Cashfree, and redeem promotional coupon codes.
*   **Installer KYC Verification:** Installers MUST complete an Aadhar OTP verification process to become "verified." This is a mandatory prerequisite for bidding on jobs and receiving payouts, ensuring a trusted marketplace.
*   **Secure Authentication:** Email/password-based login via Firebase Authentication, protected by client-side login attempt throttling to mitigate brute-force attacks.

### The Complete Job Lifecycle
1.  **Job Posting (Job Giver):**
    *   **AI Job Scoping Wizard:** For novice users, a conversational interface asks for a simple description (e.g., "I need cameras for my shop"). The AI then generates a complete, structured job post with a professional title, description, suggested skills, and budget.
    *   **Manual Posting:** Expert users can skip the wizard and fill out a detailed form manually, including title, description, skills, location, budget, and bidding deadline.
    *   **AI-Assisted Details:** In manual mode, an "AI Generate" button uses the job title to create a compelling job description, a list of required skills, and a realistic budget estimate.
    *   **Direct Award (Optional):** A Job Giver can skip public bidding by entering a known installer's public ID, sending the job offer directly to them.
2.  **Job Discovery (Installer):**
    *   Verified installers browse public jobs via a searchable, filterable interface.
    *   A "Recommended" tab uses AI to match installers with jobs based on their skills and location, including "Unbid" jobs to create new opportunities.
3.  **Bidding (Installer):**
    *   Installers place bids, specifying their price and a cover letter.
    *   **AI Feature:** An "AI Bid Assistant" helps installers craft a professional and persuasive cover letter based on the job description and their own profile.
4.  **Awarding (Job Giver):**
    *   After the deadline, the Job Giver reviews all bids and selects up to 3 installers to send offers to.
    *   The job status becomes "Awarded," and a 24-hour `acceptanceDeadline` is set.
5.  **Acceptance & Funding:**
    *   The first selected installer to accept the offer wins the job. The job status changes to **"Pending Funding,"** and a 48-hour `fundingDeadline` is set for the Job Giver.
    *   The Job Giver funds the project via Cashfree Payment Gateway. **CRITICAL:** Funds are held in a regulated Marketplace Settlement account ("Easy Split"), not the platform's bank account.
    *   Upon successful funding, the status changes to **"In Progress."**
6.  **Job Execution & Modifications:**
    *   The Job Giver and Installer communicate via a private, auditable messaging thread.
    *   **Formal Date Change:** Either party can formally propose a new `jobStartDate`. The other party must explicitly accept or reject the proposal. This is tracked in the `dateChangeProposal` field.
7.  **Job Completion & Payout:**
    *   The Job Giver shares a 6-digit `completionOtp` with the installer.
    *   The installer enters the OTP to mark the job as "Completed."
    *   This OTP trigger initiates an API call to Cashfree's Payouts product, which automatically splits the payment from the settlement account: the installer receives their earnings, and the platform receives its commission.
8.  **Feedback & Invoicing:**
    *   The Job Giver can rate the installer and leave a review, which impacts the installer's reputation points.
    *   Upon completion, a formal invoice from the Installer to the Job Giver is automatically generated and made available on the job details page.

### Exception & Recovery Workflows
*   **Award Expiration:** A scheduled function (`handleExpiredAwards`) runs hourly. If an "Awarded" job's `acceptanceDeadline` passes, it automatically reverts to "Bidding Closed," allowing the Job Giver to award it to someone else.
*   **Funding Timeout:** A scheduled function (`handleUnfundedJobs`) runs every 6 hours. If a "Pending Funding" job's `fundingDeadline` passes, it is automatically "Cancelled," and both parties are notified.
*   **Unbid Jobs:** If a job receives no bids, its status becomes "Unbid." The Job Giver is presented with two options:
    *   **Repost:** Instantly create a new job using the old one as a template.
    *   **Promote & Re-list:** Add a `travelTip` (a commission-free bonus for the installer) and re-list the job to attract more interest.

### Platform Management & Monetization
*   **Admin Dashboard & Reports:** A comprehensive backend for administrators to manage the platform, featuring KPI cards, charts on user growth and financials, and data export capabilities.
*   **Team Management:** A dedicated section for the primary Admin to create and manage other `Admin` and `Support Team` user accounts.
*   **Monetization Settings:** Admins can configure platform-wide settings, including installer commission rates, job giver fees, and create/manage `SubscriptionPlan` and `Coupon` entities.
*   **Global Blacklist:** A critical security feature allowing Admins to block specific User IDs or pincodes, preventing them from registering, logging in, or posting jobs.
*   **Dispute Resolution:** A formal system for users to raise disputes, which are then managed by the `Admin` or `Support Team` roles. Admins can trigger refunds or payouts via the backend if necessary.

### Job Giver & Installer Relationship Tools
*   **Installer Directory (Premium Feature):** Subscribed Job Givers can access a searchable directory to proactively find, filter, and review profiles of all verified installers.
*   **"My Installers" CRM:** A personal CRM for Job Givers to manage their network, with tabs for:
    *   **Previously Hired:** A list of all installers they have successfully worked with.
    *   **Favorites:** A curated list of preferred installers, sourced from the "Previously Hired" list.
    *   **Blocked:** A personal blocklist to prevent specific installers from bidding on their jobs.

---

## 3. Demo Accounts for Testing

To test the platform's features, use the following credentials. All accounts are pre-seeded when you run `npm run db:seed`.

*   **Default Password for all users:** `Vikas@129229`

| Role                | Email                             | Description                                                               |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| **Admin**           | `vikasakankshasharma@gmail.com`   | Full access to all platform features, settings, and user management.      |
| **Job Giver**       | `jobgiver@example.com`            | Can post jobs, award projects, and manage hired installers.               |
| **Installer (Dual)**| `installer@example.com`           | A verified, Gold-tier installer who can also post jobs (switchable role). |
| **Support Team**    | `support@example.com`             | Limited access, primarily for resolving user disputes.                    |

---

## 4. Technical Stack & Architecture

*   **Framework:** Next.js 14+ with App Router.
*   **Language:** TypeScript.
*   **UI Components:** ShadCN/UI, built on Radix UI and Tailwind CSS.
*   **Styling:** Tailwind CSS. Use `globals.css` for theme variables.
*   **State Management:** React Context and Hooks.
*   **Forms:** React Hook Form with Zod for validation.
*   **Database:** Firestore (Firebase).
*   **Authentication:** Firebase Authentication (Email/Password).
*   **Backend Functions:** Firebase Cloud Functions for scheduled tasks and notifications.
*   **AI Functionality:** Genkit, configured to use Google's Gemini models.
*   **Icons:** `lucide-react`.

### File System Architecture
```
/src
├── app/
│   ├── (main)/              # Main marketing/landing pages
│   │   ├── page.tsx         # Landing page
│   │   └── layout.tsx
│   ├── dashboard/           # Authenticated part of the app
│   │   ├── layout.tsx       # Main dashboard layout with sidebar/header
│   │   ├── page.tsx         # Role-specific dashboard homepage
│   │   ├── all-jobs/        # [Admin] View all jobs
│   │   ├── blacklist/       # [Admin] Manage blacklisted users/pincodes
│   │   ├── coupons/         # [Admin] Manage coupons
│   │   ├── disputes/        # View/manage disputes
│   │   ├── installers/      # [Job Giver] Installer Directory
│   │   ├── jobs/            # Browse jobs ([Installer]) & view job details
│   │   ├── my-bids/         # [Installer] View bids they have placed
│   │   ├── my-installers/   # [Job Giver] Manage hired/favorite/blocked installers
│   │   ├── post-job/        # [Job Giver] Page to create a new job
│   │   ├── posted-jobs/     # [Job Giver] View jobs they have posted
│   │   ├── profile/         # User's own profile page
│   │   ├── reports/         # [Admin] Reports and analytics
│   │   ├── settings/        # App settings (Personal & Admin)
│   │   ├── subscription-plans/ # [Admin] Manage subscription plans
│   │   ├── team/            # [Admin] Manage admin/support users
│   │   ├── transactions/    # [Admin] View all financial transactions
│   │   └── users/           # [Admin] User directory
│   ├── login/
│   │   └── page.tsx         # Login and Sign Up forms
│   └── layout.tsx           # Root layout
├── ai/
│   ├── flows/               # Genkit flows for AI features
│   └── genkit.ts            # Genkit initialization
├── components/
│   ├── auth/                # Login/Signup forms
│   ├── dashboard/           # Sidebar, Header
│   ├── ui/                  # ShadCN UI components (Button, Card, etc.)
│   └── *.tsx                # Other shared components (e.g., job-card.tsx)
├── hooks/
│   ├── use-user.tsx         # Critical hook for managing auth state and user data
│   └── ...                  # Other custom hooks
├── lib/
│   ├── firebase/
│   │   ├── client-provider.ts # Client-side Firebase initialization
│   │   ├── server-init.ts   # Server-side Firebase Admin initialization
│   │   └── seed.ts          # Database seeding script
│   ├── types.ts             # All TypeScript type definitions for Firestore entities
│   └── utils.ts             # Utility functions
└── ...
```

---

## 5. UI/UX & Style Guidelines

*   **Primary Color:** `#B0B6C4` (Desaturated grayish-blue)
*   **Background Color:** `#F0F2F5` (Very light grayish-blue)
*   **Accent Color:** `#C88E4D` (Muted amber)
*   **Font:** 'Inter', sans-serif.
*   **Layout:** Clean, modern, with generous whitespace. Use `Card` components for grouping information. Dashboards use a main content area with a left-hand icon-based sidebar and a top header.
*   **Responsiveness:** The app must be fully responsive and function as a PWA on mobile devices.

---

## 6. Data Models (Firestore)

All data models are defined in `src/lib/types.ts` and reflected in `docs/backend.json`.

*   **`users` collection:** Stores `UserProfile` objects. Key fields include `id`, `name`, `email`, `roles` (array), `status`, `pincodes`, `address`, `subscription`, `favoriteInstallerIds`, `blockedInstallerIds`, and the nested `installerProfile` object.
*   **`installerProfile` sub-object:** Contains installer-specific data: `tier`, `points`, `skills`, `rating`, `reviews`, `verified`, and `reputationHistory`.
*   **`jobs` collection:** Stores `Job` objects. This is the central entity, containing all job details, budget, `status`, deadlines (`deadline`, `acceptanceDeadline`, `fundingDeadline`), `dateChangeProposal` object, and embedded arrays for `bids`, `comments`, and `privateMessages`.
*   **`disputes` collection:** Stores `Dispute` objects for tracking and resolving all user-raised issues.
*   **`transactions` collection:** A financial ledger storing all `Transaction` objects, providing an audit trail for payments, payouts, commissions, and fees.
*   **Admin Collections:**
    *   `/settings/platform`: A singleton document for global `PlatformSettings`.
    *   `subscriptionPlans`: Stores all `SubscriptionPlan` objects.
    *   `coupons`: Stores all `Coupon` objects.
    *   `blacklist`: Stores `BlacklistEntry` objects for users and pincodes.
---

This detailed prompt provides a clear and comprehensive guide for any developer to understand, maintain, and extend the "CCTV Job Connect" application correctly and efficiently.
