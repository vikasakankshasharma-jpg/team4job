# CCTV Job Connect

## 1. Getting Started

### Prerequisites
*   Node.js v20+
*   npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd DoDo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Duplicate `.env` to `.env.local` and fill in the required values (see [Environment Configuration](#environment-configuration) below).

4.  **Seed the Database (Optional):**
    Populate Firestore with initial test data.
    ```bash
    npm run db:seed
    ```

5.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 2. Environment Configuration

Create a `.env.local` file in the root directory. You will need keys from Firebase, Google Cloud, and Cashfree.

### Required Variables

| Variable | Description | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth Domain | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage Bucket | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID | Firebase Console |
| `FIREBASE_PROJECT_ID` | Admin SDK Project ID | Service Account |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK Client Email | Service Account |
| `FIREBASE_PRIVATE_KEY` | Admin SDK Private Key | Service Account (Handle newlines with `\n`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API | Google Cloud Console |
| `CASHFREE_APP_ID` | Cashfree App ID | Cashfree Dashboard |
| `CASHFREE_SECRET_KEY` | Cashfree Secret | Cashfree Dashboard |
| `CASHFREE_WEBHOOK_SECRET` | Webhook Secret | Cashfree Dashboard |
| `GEMINI_API_KEY` | AI Model Key | Google AI Studio |
| `BREVO_API_KEY` | Email API Key | Brevo Dashboard (for Notifications) |

**Note:** For the `FIREBASE_PRIVATE_KEY`, ensure you wrap the key in quotes if it contains newlines, or replace real newlines with `\n`.

### Automated Secrets Setup (GitHub Actions)
For CI/CD to work, you need to sync your local secrets to GitHub. We have a helper script for this:

1.  **Install GitHub CLI:** [https://cli.github.com/](https://cli.github.com/)
2.  **Authenticate:** `gh auth login`
3.  **Run Sync Script:**
    ```powershell
    ./scripts/sync-secrets.ps1
    ```
    This automatically uploads required values from `.env.local` to your repository's secrets.

### Monitoring (Sentry)
The application is configured with Sentry for error tracking.
- **DSN:** Configured in `sentry.client.config.ts` and `sentry.server.config.ts`.
- **Auth Token:** `SENTRY_AUTH_TOKEN` required in GitHub Secrets for source map uploads during build.

---

## 3. Known Issues & Workarounds

> [!WARNING]
> **Google Maps API Billing Issue (Current)**
> The Google Maps API is currently paused due to pending billing verification.
> **Workaround:** The application has been patched to support **Manual Address Entry**. The signup form's map component is disabled, allowing you to type addresses manually.

---

## 4. High-Level App Concept

**App Name:** CCTV Job Connect

**Core Purpose:** A sophisticated, AI-enhanced marketplace connecting "Job Givers" (clients) with verified, skilled "Installers" for CCTV installation and maintenance services. The platform is architected around a subscription model to support professional users and ensure sustainable revenue.

**Target Audience:**
*   **Job Givers:** Homeowners, business owners, and property managers needing CCTV services. This includes both non-technical novices and high-volume "Pro" users who manage multiple properties.
*   **Installers:** Vetted, professional CCTV and security system installers seeking employment opportunities, from individual contractors to small businesses.

---

## 5. Core Features & Business Logic

### User & Subscription System
*   **Dual Roles & Role Switching:** Users can sign up as a "Job Giver" or "Installer". A user can hold both roles and instantly switch between modes from their profile menu without logging out.
*   **Subscription Model:** The platform operates on a freemium model. New users receive a trial or a basic plan. Access to premium features (e.g., browsing the Installer Directory, AI Bid Analysis) requires an active paid subscription.
*   **Billing Management:** A dedicated "Billing" page where users can view their current plan, upgrade their subscription via Cashfree, and redeem promotional coupon codes. The system supports context-aware redirects, returning users to the feature they were trying to access after a successful purchase.
*   **Tiered Installer Verification:**
    *   **Freelancer (Basic):** Identity verification via Aadhar OTP. Grants "Welcome Points" (50) to help new installers get started.
    *   **Pro (Silver):** Established businesses can provide Shop Photos & GSTIN to earn "Pro" status and higher reputation visibility.
*   **Secure Authentication:** Email/password-based login via Firebase Authentication, protected by client-side login attempt throttling to mitigate brute-force attacks.

### The Complete Job Lifecycle
1.  **Job Posting (Job Giver):**
    *   **AI Job Scoping Wizard:** For novice users, a conversational interface asks for a simple description (e.g., "I need cameras for my shop"). The AI then generates a complete, structured job post with a professional title, description, suggested skills, and budget.
    *   **Manual Posting:** Expert users can skip the wizard and fill out a detailed form manually, including title, description, skills, location, budget, and bidding deadline.
    *   **AI-Assisted Details:** In manual mode, an "AI Generate" button uses the job title to create a compelling job description and a list of required skills.
    *   **Direct Award (Private Bid Request):** A Job Giver can skip public bidding by entering a known installer's public ID. This sends a *private request to bid* on the job directly to that installer. The job is not visible to others.

2.  **Bidding & Private Offers:**
    *   **Public Bidding (Installer):** Verified installers browse public jobs and place bids, specifying their price and a cover letter. An "AI Bid Assistant" helps installers craft a professional and persuasive cover letter.
    *   **Private Bidding (Installer):** An installer who receives a Direct Award request is prompted to submit their bid privately. This bid becomes the official price for the job.
    *   **Blind Bidding (Fairness):** Bid amounts are masked (`₹ ••••`) from competing installers to prevent "race-to-the-bottom" pricing. Only the Job Giver and the bidder themselves can see the actual price.
    *   **Marketplace Integrity (Anti-Self-Bidding):** The system strictly prohibits a user from bidding on a job they themselves have posted, preventing reputation farming and price manipulation.

3.  **Awarding & Bid Analysis (Job Giver):**
    *   After the bidding deadline (or after a private bid is received), the Job Giver reviews all bids.
    *   **AI Bid Analysis (Premium Feature):** A subscribed Job Giver can use an AI-powered tool to analyze all bids. The analysis provides a summary, a top recommendation, a "best value" option, and red flags.
    *   **Relationship-Aware Bidding:** The bidding UI and AI analysis are "Relationship-Aware." Bids from installers previously marked as "Favorite" or "Blocked" by the Job Giver are clearly badged, and the AI heavily weights this personal trust signal in its recommendations.
    *   **Strategic Awarding:** The Job Giver can select up to 3 installers and choose their award strategy:
        *   **Simultaneous:** Send offers to all selected installers at once. The first one to accept wins the job.
        *   **Sequential (Ranked):** Rank the selected installers. The offer is sent to the #1 choice first. If they decline or their time expires, the offer is automatically sent to the #2 choice, and so on.

4.  **Acceptance & Funding:**
    *   The first selected installer to accept the offer wins the job. The job status changes to **"Pending Funding,"** and a 48-hour `fundingDeadline` is set for the Job Giver.
    *   The Job Giver funds the project via Cashfree Payment Gateway. **CRITICAL:** Funds are held in a regulated Marketplace Settlement account ("Easy Split"), not the platform's bank account.
    *   Upon successful funding, the status changes to **"In Progress."**

5.  **Job Execution & Scope Changes:**
    *   The Job Giver and Installer communicate via a private, auditable messaging thread. All communication must remain on the platform.
    *   **Formal Date Change:** Either party can formally propose a new `jobStartDate`. The other party must explicitly accept or reject the proposal.
    *   **Additional Tasks:** Either party can propose an additional task. The installer provides a quote, which the Job Giver must approve and fund before work begins.

6.  **Dual-Confirmation Completion & Payout:**
    *   **Installer Submission:** The installer uploads "Proof of Work" (photos/videos) through the platform and submits the job for review, changing the status to `Pending Confirmation`.
    *   **Job Giver Approval:** The Job Giver receives a notification, reviews the proof, and must explicitly click "Approve & Release Payment."
    *   **Automated Payout:** The Job Giver's approval is the final trigger. It changes the job status to "Completed" and initiates an API call to Cashfree's Payouts product.
    *   **Auto-Settle Protection:** To protect installers from "ghosting," if a Job Giver fails to approve submitted work within **5 days**, the system automatically releases the funds to the installer.

7.  **Feedback & Invoicing:**
    *   The Job Giver can rate the installer and leave a review, which impacts the installer's reputation points.
    *   Upon completion, a formal invoice from the Installer to the Job Giver is automatically generated and made available on the job details page.

### Exception & Recovery Workflows
*   **Mutual Cancellation:** Either party can initiate a cancellation request for `In Progress` jobs. The other party is notified to "Accept" or "Decline." If accepted, the job is marked `Cancelled`, and the Job Giver is prompted for a refund.
*   **Offer Expiration (Installer):** If an installer fails to accept an offer within the time limit, they are penalized with a small reputation point deduction. They are then given a one-time option on the job page to "Request to Re-apply," which notifies the Job Giver and makes them eligible for selection again.
*   **Funding Timeout (Job Giver):** A scheduled function (`handleUnfundedJobs`) runs every 6 hours. If a "Pending Funding" job's `fundingDeadline` passes, it is automatically "Cancelled," and both parties are notified.
*   **Unbid Jobs (Job Giver):** If a job receives no bids, its status becomes "Unbid." The Job Giver is presented with two recovery options:
    *   **Repost:** Instantly create a new job using the old one as a template.
    *   **Promote & Re-list:** Add a commission-free `travelTip` to the job and set a new deadline to attract a wider range of installers.

### Platform Management & Monetization
*   **Admin Dashboard & Reports:** A comprehensive backend for administrators to manage the platform, featuring KPI cards, charts on user growth and financials, and data export capabilities.
*   **Team Management:** A dedicated section for the primary Admin to create and manage other `Admin` and `Support Team` user accounts.
*   **Monetization Settings:** Admins can configure platform-wide settings, including installer commission rates, job giver fees, and create/manage `SubscriptionPlan` and `Coupon` entities.
*   **Global Blacklist:** A critical security feature allowing Admins to block specific User IDs or pincodes, preventing them from registering, logging in, or posting jobs.
*   **Dispute Resolution:** A formal system for users to raise disputes. Admins can **Freeze** transactions during investigation and forcefully **Release** or **Refund** payments if necessary.
*   **Dynamic Commissions:** Platform fees can be configured per-category, allowing flexible monetization strategies for different job types.

### Job Giver & Installer Relationship Tools
*   **Installer Directory (Premium Feature):** Subscribed Job Givers can access a searchable directory to proactively find, filter, and review profiles of all verified installers.
*   **"My Installers" CRM:** A personal CRM for Job Givers to manage their network, with tabs for:
    *   **Previously Hired:** A list of all installers they have successfully worked with.
    *   **Favorites:** A curated list of preferred installers, sourced from the "Previously Hired" list. This list is used to highlight bids from trusted installers.
    *   **Blocked:** A personal blocklist to prevent specific installers from bidding on their jobs.

---

## 6. Demo Accounts for Testing

To test the platform's features, you can use the pre-seeded accounts or generate a new verified installer.

*   **Default Password:** `Vikas@129229` (for seeded accounts) / `password123` (for manually created accounts)

| Role | Email | Description |
| :--- | :--- | :--- |
| **Admin** | `vikasakankshasharma@gmail.com` | Full access to platform settings. |
| **Job Giver** | `jobgiver@example.com` | Can post jobs and hire. |
| **Installer** | `installer@example.com` | Verified, Gold-tier installer. |
| **New Installer** | `installer_final@test.com` | Pass: `password123` (Use `create_test_installer.ts` to reset). |

**Creating a Fresh Test User:**
If you need a pristine Installer account:
```bash
npx tsx src/lib/firebase/create_test_installer.ts
```

---

## 7. Technical Stack & Architecture

*   **Framework:** Next.js 16+ (Turbopack) with App Router.
*   **Language:** TypeScript.
*   **UI Components:** ShadCN/UI, built on Radix UI and Tailwind CSS.
*   **Styling:** Tailwind CSS. Use `globals.css` for theme variables.
*   **State Management:** React Context and Hooks.
*   **Forms:** React Hook Form with Zod for validation.
*   **Database:** Firestore (Firebase).
*   **Authentication:** Firebase Authentication (Email/Password).
*   **Backend Functions:** 
    *   **Firebase Cloud Functions:** Scheduled tasks (e.g., job expiry).
    *   **Vercel API Routes:** Real-time notifications (Email) via Zero-Cost proxy.
*   **AI Functionality:** Genkit, configured to use Google's Gemini models.
*   **Icons:** `lucide-react`.

### File System Architecture
```
/src
├── app/
│   ├── (main)/              # Main marketing/landing pages
│   │   ├── api/             # Vercel API Routes (Notifications, Cashfree)
│   │   ├── page.tsx         # Landing page
│   │   └── layout.tsx
│   ├── dashboard/           # Authenticated part of the app
│   │   ├── layout.tsx       # Main dashboard layout with sidebar/header
│   │   ├── page.tsx         # Role-specific dashboard homepage
│   │   ├── all-jobs/        # [Admin] View all jobs
│   │   ├── blacklist/       # [Admin] Manage blacklisted users/pincodes
│   │   ├── billing/         # [User] Manage subscription
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
│   │   ├── client-provider.tsx # Client-side Firebase initialization
│   │   ├── server-init.ts   # Server-side Firebase Admin initialization
│   │   └── seed.ts          # Database seeding script
│   ├── types.ts             # All TypeScript type definitions for Firestore entities
│   └── utils.ts             # Utility functions
└── ...
```

```

---

## 5. Testing & CI/CD

This project uses a robust automated testing strategy to ensure reliability.

### Local Testing

*   **Smoke Tests:** Fast, critical path tests (Login, Navigation).
    ```bash
    npm run test:smoke
    ```
*   **Full E2E Tests:** Comprehensive user flows (Job Posting, Bidding, Hiring).
    ```bash
    npm run test:full
    ```
*   **Lint & Type Check:**
    ```bash
    npm run lint
    npm run typecheck
    ```

### CI/CD Pipeline (GitHub Actions)
The pipeline runs automatically on every push to `main`. It includes:
1.  **Validation:** Linting and Type Checking.
2.  **Build:** Verifies the app builds successfully (with Sentry source maps).
3.  **Automated Testing:** Runs Smoke Tests in a headless browser against the production build.
4.  **Deployment:** (configured) Deploys to production if all tests pass.

**Triggering CI Manually:**
You can trigger a run by pushing an empty commit:
```bash
git commit --allow-empty -m "chore: trigger CI"
git push
```

---

## 6. UI/UX & Style Guidelines

*   **Primary Color:** `#B0B6C4` (Desaturated grayish-blue)
*   **Background Color:** `#F0F2F5` (Very light grayish-blue)
*   **Accent Color:** `#C88E4D` (Muted amber)
*   **Font:** 'Inter', sans-serif.
*   **Layout:** Clean, modern, with generous whitespace. Use `Card` components for grouping information. Dashboards use a main content area with a left-hand icon-based sidebar and a top header.
*   **Responsiveness:** The app must be fully responsive and function as a PWA on mobile devices.

---

## 7. Data Models (Firestore)

All data models are defined in `src/lib/types.ts` and reflected in `docs/backend.json`.

*   **`users` collection:** Stores `UserProfile` objects. Key fields include `id`, `name`, `email`, `roles` (array), `status`, `pincodes`, `address`, `subscription`, `favoriteInstallerIds`, `blockedInstallerIds`, and the nested `installerProfile` object.
*   **`installerProfile` sub-object:** Contains installer-specific data: `tier`, `points`, `skills`, `rating`, `reviews`, `verified`, and `reputationHistory`.
*   **`jobs` collection:** Stores `Job` objects. This is the central entity, containing all job details, `budget`, `status`, deadlines (`deadline`, `acceptanceDeadline`, `fundingDeadline`), `dateChangeProposal` object, `cancellationProposer`, and embedded arrays for `bids`, `comments`, and `privateMessages`.
*   **`disputes` collection:** Stores `Dispute` objects for tracking and resolving all user-raised issues.
*   **`transactions` collection:** A financial ledger storing all `Transaction` objects, providing an audit trail for payments, payouts, commissions, and fees.
*   **Admin Collections:**
    *   `/settings/platform`: A singleton document for global `PlatformSettings`.
    *   `subscriptionPlans`: Stores all `SubscriptionPlan` objects.
    *   `coupons`: Stores all `Coupon` objects.
    *   `blacklist`: Stores `BlacklistEntry` objects for users and pincodes.

---

## 8. Zero-Cost Infrastructure (Production)
The platform is optimized to run on a **$0 budget** for the first 100-500 users by leveraging free tiers of robust service providers.

### Architecture Shift: "Vercel Proxy"
To bypass the credit-card requirement of Firebase Cloud Functions for external API calls, we route email logic through Vercel's API limits.

| Feature | Provider | Plan | Limit | Method |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting & API** | **Vercel** | Hobby | Unlimited (Fair Use) | `src/app/api/notifications/send` |
| **Email Service** | **Brevo** | Free | 300 emails/day | SMTP/API via Vercel Route |
| **Database/Auth** | **Firebase** | Spark | 50k reads/day | Client-Side SDK |
| **Phone Auth** | **Firebase** | Spark | 10 SMS/day | `signInWithPhoneNumber` |

*Note: The 10 SMS/day limit on Firebase Spark is the only tight bottleneck for high-volume signup days. Upgrading to Blaze (Pay-as-you-go) removes this.*
