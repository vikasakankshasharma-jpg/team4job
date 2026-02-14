# Team4Job: The Master Developer Guide
> **"Zero to Hero" Manual for Recreating the Platform**

![Deployment](https://img.shields.io/badge/deployment-live-success)
![Next.js](https://img.shields.io/badge/Next.js-14.x-black)
![Firebase](https://img.shields.io/badge/Firebase-Spark%20Plan-orange)
![Readiness](https://img.shields.io/badge/Readiness-100%25-brightgreen)

**Production URL:** [https://dodo-beta.web.app](https://dodo-beta.web.app)

[View Readiness Summary](./READINESS_100_SUMMARY.md)

## 1. Project Overview & Vision

**Team4Job** is a sophisticated, AI-enhanced marketplace connecting "Job Givers" (clients) with verified "Installers" (CCTV/Security professionals).

> 📘 **Master Architecture Guide**: For a complete deep-dive into the system prompt, database schema, and recreation instructions, see [system_architecture.md](./system_architecture.md).

**Core Philosophy:**
*   **Dual-Role Architecture:** Every user can be both a Job Giver and an Installer.
*   **Zero-Cost Infrastructure:** Designed to run on free tiers (Firebase Spark + App Hosting) for the first 500+ users.
*   **Safety First:** Regulated payments (Cashfree Marketplace), verified identities (Aadhar/GST), and anti-fraud logic (No self-bidding).

---

## 2. Architecture Blueprint

### Tech Stack
*   **Frontend:** Next.js 14 (App Router), React 18, TailwindCSS, ShadCN/UI.
*   **Backend:** Firebase App Hosting (running on Cloud Run), Firebase Functions for triggers.
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

This remains the core logic of the application and is detailed in the previous version of the README.

---

## 4. Zero-Cost Security Architecture

To maintain the free tier, we use a specific architecture:
1.  **Firebase App Hosting:** The Next.js application is deployed as a containerized service on Firebase App Hosting. This runs on Cloud Run, which has a generous free tier for compute resources, handling our API routes and server-side rendering.
2.  **Firebase Functions:** Used for background triggers (e.g., `onBidCreated`) that don't need to be user-facing. The free tier for function invocations is substantial.
3.  **Client-Side Throttling:** We use `lodash.debounce` on all write operations to save Firestore quotas.

---

## 5. Operational Guide

### Getting Started
```bash
# 1. Clone & Install
git clone <your-repo-url>
npm install

# 2. Setup Local Environment
# This will create a .env.local file
cp .env.example .env.local

# 3. Populate .env.local with the keys from the Appendix below

# 4. Run Locally
npm run dev
```

### Testing Strategy
We use **Playwright** for everything. Do NOT skip these before pushing.

*   **E2E Suite (Critical Flows):**
    ```bash
    npm run test:e2e
    ```

### Deployment
*   **Production:** Deploys automatically to **dodo-beta.web.app** via GitHub Actions on push to the `main` branch.
*   **Configuration:** The deployment is configured in `apphosting.yaml`.
*   **Manual Trigger:** You can manually trigger the "Deploy to Production" workflow in the GitHub Actions tab.

---

## 6. Comprehensive Role Scenarios

This section details the various user stories and is unchanged.

---

## 7. Appendix

### Key Test Data (Seeded)
*   **Admin:** `vikasakankshasharma@gmail.com`
*   **Job Giver:** `jobgiver@example.com`
*   **Installer:** `installer@example.com`
*   **Password:** `password123`

### Environment Variables (.env.local)
These keys must be added to your `.env.local` file for the application to run.

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Frontend API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`| Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID`| Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`| Google Analytics Measurement ID for Firebase |
| `DO_FIREBASE_PROJECT_ID` | Firebase Admin Project ID |
| `DO_FIREBASE_CLIENT_EMAIL`| Firebase Admin Service Account Email |
| `DO_FIREBASE_PRIVATE_KEY`| Firebase Admin Private Key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`| Google Maps API Key |
| `CASHFREE_PAYMENTS_CLIENT_ID`| Cashfree Payments Test Client ID |
| `CASHFREE_PAYMENTS_CLIENT_SECRET`| Cashfree Payments Test Client Secret |
| `CASHFREE_PAYOUTS_CLIENT_ID`| Cashfree Payouts Test Client ID |
| `CASHFREE_PAYOUTS_CLIENT_SECRET`| Cashfree Payouts Test Client Secret |
| `CASHFREE_CLIENT_ID`| Cashfree KYC Test Client ID |
| `CASHFREE_CLIENT_SECRET`| Cashfree KYC Test Client Secret |
| `BREVO_API_KEY`| Brevo (Sendinblue) API Key for emails |
| `NEXT_PUBLIC_GA_ID`| Google Analytics ID |
| `NEXT_PUBLIC_SENTRY_DSN`| Sentry DSN for error reporting |
| `GEMINI_API_KEY`| Google Gemini API Key |
| `GOOGLE_GENAI_API_KEY`| Google GenAI API Key |
| `GOOGLE_API_KEY`| Google API Key |
