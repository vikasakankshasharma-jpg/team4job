# Team4Job: The Master Developer Guide
> **"Zero to Hero" Manual for Recreating the Platform**

![Deployment](https://img.shields.io/badge/deployment-live-success)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![Firebase](https://img.shields.io/badge/Firebase-Spark%20Plan-orange)
![Readiness](https://img.shields.io/badge/Readiness-100%25-brightgreen)

[View Readiness Summary](./READINESS_100_SUMMARY.md)

## 1. Project Overview & Vision

**Team4Job** is a sophisticated, AI-enhanced marketplace connecting "Job Givers" (clients) with verified "Installers" (CCTV/Security professionals).

**Core Philosophy:**
*   **Dual-Role Architecture:** Every user can be both a Job Giver and an Installer.
*   **Zero-Cost Infrastructure:** Designed to run on free tiers (Firebase Spark + Vercel Hobby) for the first 500 users.
*   **Safety First:** Regulated payments (Cashfree Marketplace), verified identities (Aadhar/GST), and anti-fraud logic (No self-bidding).

---

## 2. Architecture Blueprint

### Tech Stack
*   **Frontend:** Next.js 16 (App Router), React 19, TailwindCSS, ShadCN/UI.
*   **Backend:** Firebase (Firestore, Auth), Vercel API Routes (for cost-free serverless functions).
*   **Database:** Cloud Firestore (NoSQL).
*   **AI:** Google Gemini (via Genkit) for job scoping and bid analysis.
*   **Payments:** Cashfree Payment Gateway (Marketplace Split logic).
*   **Maps:** Google Maps API (Geocoding, Places).

### Folder Structure Convention
```bash
/src
  /app          # App Router (Pages & API Routes)
    /dashboard  # Protected routes (Role-based access)
    /api        # Serverless functions (Webhooks, Notifications)
  /components   # React Components
    /ui         # ShadCN Primitives (Atomic Design)
    /dashboard  # Business Logic Components
  /lib          # Core Logic
    /firebase   # Initialization & Seed scripts
    types.ts    # centralized TypeScript interfaces (Source of Truth)
  /ai           # Genkit flows (Gemini integration)
```

---

## 3. Step-by-Step Implementation Guide

If you were rebuilding this from scratch, follow this exact sequence:

### Phase 1: Foundation & Authentication
1.  **Initialize Next.js:** `npx create-next-app@latest` with TypeScript, Tailwind, ESLint.
2.  **Firebase Setup:** Create a Firebase project. Enable Auth (Email/Pass) and Firestore.
3.  **Role Logic:**
    *   **User Schema:** See `UserProfile` in `types.ts`.
    *   **Crucial Field:** `roles: ['Job Giver', 'Installer']`.
    *   **Logic:** On login, fetch the user profile. If `roles` array contains both, show a "Switch View" toggle in the navbar.

### Phase 2: Database Schema (The "Brain")
Create these collections. Use `types.ts` as your strict schema definition.

| Collection | Doc ID | Purpose | Critical Fields |
| :--- | :--- | :--- | :--- |
| `users` | `uid` | User Profiles | `roles`, `pincodes`, `walletBalance` |
| `jobs` | `auto-id` | Job Postings | `status`, `jobGiverId`, `bids` (Subcol or Array) |
| `transactions` | `auto-id` | Financials | `payerId`, `payeeId`, `amount`, `status` |
| `disputes` | `auto-id` | Support | `requesterId`, `reason`, `status` |

**Indexing:** You MUST create composite indexes for:
*   `jobs`: `jobGiverId` (ASC) + `postedAt` (DESC)
*   `jobs`: `status` (ASC) + `deadline` (ASC)

### Phase 3: The Job Lifecycle (Core Business Logic)

#### 1. Posting a Job (Job Giver)
*   **Input:** Title, Description, Budget, Location (Google Maps).
*   **AI Feature:** Use Gemini to auto-generate description from a 3-word prompt.
*   **Status Entry:** Set `status: 'Open for Bidding'`.

#### 2. Bidding (Installer)
*   **Validation:** Check if `user.id === job.jobGiverId`. If yes, **BLOCK** (Self-bidding protection).
*   **Blind Bidding:** In the UI, mask other bidders' amounts (`₹ ••••`) to prevent price wars.
*   **Data:** Add a `Bid` object to the `job.bids` array.

#### 3. Awarding (Job Giver)
*   **Selection:** Giver picks an installer.
*   **State Change:** `status` -> `Pending Funding`.
*   **Action:** Generate a `fundingDeadline` (48 hours).

#### 4. Funding (Escrow)
*   **Gateway:** Initiate Cashfree Payment.
*   **Settlement:** Money goes to **Marketplace Account**, not your bank account.
*   **Success:** Webhook receives `SUCCESS`. Update `status` -> `In Progress`.

#### 5. Completion & Payout
*   **Work Proof:** Installer uploads photo. `status` -> `Pending Confirmation`.
*   **Approval:** Job Giver clicks "Approve".
*   **Payout:** Trigger Cashfree `Easy Split`.
    *   `Vendor Amount`: 90% (to Installer)
    *   `Platform Fee`: 10% (to You)
*   **Final State:** `status` -> `Completed`.

---

## 4. Zero-Cost Security Architecture

To maintain the free tier, we use a specific architecture:
1.  **No Cloud Functions (Paid):** We do NOT use Firebase Cloud Functions for API calls.
2.  **Vercel Proxy:** We route external API calls (Email, SMS) through Next.js API Routes (`/src/app/api/...`), which run on Vercel's free tier.
3.  **Client-Side Throttling:** We use `lodash.debounce` on all write operations to save Firestore quotas.

---

## 5. Operational Guide

### Getting Started
```bash
# 1. Clone & Install
git clone <url>
npm install

# 2. Setup Environment
cp .env .env.local
# Add keys: FIREBASE_*, CASHFREE_*, GEMINI_API_KEY

# 3. Seed Data (Crucial for testing)
npm run db:seed  # Creates dummy users & jobs

# 4. Run Locally
npm run dev
```

### Testing Strategy
We use **Playwright** for everything. Do NOT skip these before pushing.

*   **Regression Suite (Critical Flows):**
    ```bash
    npm run test:regression
    ```
    *Runs: Full Transaction Cycle + Mobile Responsiveness Tests*

*   **Lighthouse (Performance):**
    ```bash
    npm run test:lighthouse
    ```

### Deployment
*   **Production:** Deploys automatically to `team4job.com` via GitHub Actions on push to `main`.
*   **Manual:** `firebase deploy` (hosting only).

---

## 6. Comprehensive Role Scenarios

### A. Job Giver Scenarios (The Clients)

#### 1. The "Non-Technical" Posting (AI Wizard)
*   **User Goal:** "I just want a camera in my shop, I don't know the specs."
*   **Flow:** User enters "CCTV for jewelry shop" -> Click "AI Generate".
*   **System Action:** Genkit creates a structured post: "3 High-Res Dome Cameras, Night Vision required".
*   **Outcome:** A professional job post is created without the user knowing technical jargon.

#### 2. The Direct Award (Private Hiring)
*   **User Goal:** "I want to hire John Doe specifically because he did my neighbor's house."
*   **Flow:** Post Job -> Select "Direct Award" -> Enter Installer ID (`installer-123`).
*   **System Action:**
    *   Job status = `Open for Bidding` (but `visibility` = `private`).
    *   Notification sent ONLY to John Doe.
    *   Public board does NOT show this job.
*   **Outcome:** Private transaction loop.

#### 3. Bidding Analysis (Decision Paralysis)
*   **User Goal:** "I have 15 bids, who is the best?"
*   **Flow:** User clicks "Analyze Bids with AI".
*   **System Action:** Genkit reads all 15 cover letters + Installer Ratings.
*   **Output:** "Top Recommendation: Installer B (Highest Rating, Fair Price). Best Value: Installer F (Lowest Price, Good Reviews)."

#### 4. The "No-Show" Dispute
*   **Scenario:** Job is funded (`In Progress`), but Installer never showed up.
*   **Flow:** Job Giver clicks "Report Issue" -> "Installer No-Show".
*   **System Action:**
    *   Creates `Dispute` record.
    *   Freezes the Job (No payouts possible).
    *   Notifies Admin.

### B. Installer Scenarios (The Professionals)

#### 1. Zero-Balance Bidding (Freemium)
*   **Scenario:** New installer, 0 wallet balance.
*   **System Logic:**
    *   New users get **3 Free Bids**.
    *   After 3 bids, system prompts "Upgrade to Silver Tier".
*   **Outcome:** Removes friction for onboarding new supply.

#### 2. The "Start OTP" (Proof of Presence)
*   **Scenario:** Installer arrives at the site.
*   **Risk:** Client claims "He never came."
*   **Flow:**
    *   Client's App shows a 4-digit OTP.
    *   Installer asks Client for OTP -> Enters in their App.
    *   System validates & logs timestamp `workStartedAt`.
*   **Outcome:** Irrefutable proof of physical presence.

#### 3. Scope Creep (Additional Tasks)
*   **Scenario:** Client says "Can you also fix the doorbell while you are here?"
*   **Risk:** Doing free work / getting paid off-platform.
*   **Flow:**
    *   Installer clicks "Add Task" -> "Fix Doorbell" -> "₹500".
    *   Client gets push notification -> "Approve & Fund".
    *   Client pays ₹500 via Cashfree.
*   **Outcome:** Revenue capture + documented change order.

#### 4. Payout Preferences
*   **Scenario:** Job Completed. Money released.
*   **Options:**
    1.  **Bank Transfer:** Enter IFSC/Account No.
    2.  **UPI:** Enter VPA.
*   **System:** Uses Cashfree Payouts to route funds instantly (T+0 settlement).

### C. Admin Scenarios (The Controllers)

#### 1. The "Force Release" (Unresponsive Client)
*   **Scenario:** Installer finished work, uploaded proof. Client is ghosting (not clicking "Approve") to delay payment.
*   **System Action (Auto):**
    *   Timer starts at `workSubmittedAt`.
    *   At **Day 5**, System runs `handleExpiredAwards`.
    *   **Action:** Auto-approves the job, releases funds to Installer.
*   **Outcome:** Protects gig workers from wage theft.

#### 2. Blacklisting a Bad Actor
*   **Scenario:** User `bad_guy_99` is abusive in chat.
*   **Admin Action:** Dashboard -> Blacklist -> Add User ID `bad_guy_99`.
*   **System Effect:**
    *   User is logged out force-fully.
    *   Cannot log in again.
    *   All their active bids are withdrawn.

#### 3. Commission Rate Adjustment
*   **Scenario:** Platform wants to run a "Zero Fee" promotion.
*   **Admin Action:** Dashboard -> Platform Settings -> Set `installerCommission` = 0%.
*   **System Effect:** All *future* jobs (created after this moment) will have 0% fee. Existing jobs preserve their original contract.

---

## 7. Appendix

### Key Test Data (Seeded)
*   **Admin:** `vikasakankshasharma@gmail.com`
*   **Job Giver:** `jobgiver@example.com`
*   **Installer:** `installer@example.com`
*   **Password:** `password123`

### Environment Variables (.env.local)
| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Auth & DB Access |
| `CASHFREE_APP_ID` | Payments |
| `GEMINI_API_KEY` | AI Features | |
