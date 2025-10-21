
# MASTER PROMPT: CCTV Job Connect PWA

This document serves as the master prompt and detailed specification for building the "CCTV Job Connect" Progressive Web App (PWA).

## 1. High-Level App Concept

**App Name:** CCTV Job Connect

**Core Purpose:** A specialized marketplace connecting "Job Givers" who need CCTV installation services with verified, skilled "Installers". The platform facilitates job posting, bidding, secure payments, and reputation management, enhanced with AI-powered tools.

**Target Audience:**
*   **Job Givers:** Homeowners, business owners, and property managers needing CCTV installations.
*   **Installers:** Professional CCTV and security system installers looking for work.

---

## 2. Core Features

### User System
*   **Secure Registration & Login:** Email/password-based authentication.
*   **Dual Roles:** Users can sign up as a "Job Giver" or "Installer". A user can hold both roles and switch between them from their profile menu without logging out.
*   **Installer KYC Verification:** Installers must complete a mock Aadhar verification process (using OTP `123456`) to become "verified". This unlocks bidding capabilities. **Note:** In a production environment, this mock flow would be replaced by a real KYC service provider like Cashfree Verification Suite.
*   **User Profiles:** Public-facing profiles showing relevant information (name, member since, tier, rating for installers).

### Job & Bidding Workflow
1.  **Job Posting (Job Giver):**
    *   Job Givers post detailed job listings including title, AI-generated description, location (pincode-based), budget range, and a bidding deadline.
    *   **AI Feature:** An "AI Generate" button next to the job description field uses the job title to generate a compelling description, skills list, and budget estimate.
2.  **Job Browsing (Installer):**
    *   Verified installers browse a list of "Open for Bidding" jobs.
    *   They can filter jobs by location (pincode), budget, and required skills.
3.  **Bidding (Installer):**
    *   Installers place bids on jobs, specifying their price and a cover letter.
    *   **AI Feature:** A "AI Bid Assistant" button helps installers craft an effective cover letter based on the job description and their own skills.
4.  **Awarding (Job Giver):**
    *   After the deadline, the Job Giver reviews all bids.
    *   They award the job to one installer.
5.  **Acceptance (Installer):**
    *   The awarded installer has 24 hours to accept or decline the job.
    *   If accepted, the job status changes to "In Progress".
6.  **Job Completion:**
    *   The Job Giver has a 6-digit "Completion OTP".
    *   Once the work is done, the installer enters this OTP to mark the job "Completed".

### Other Key Features
*   **Secure Payments:** A placeholder for a secure payment system (e.g., Razorpay, Cashfree) will be integrated. Payments are processed upon job completion, ensuring trust for both parties.
*   **Reputation System (Installers):** A points-based system. Installers earn points for completed jobs and good ratings, advancing through tiers (Bronze, Silver, Gold, Platinum).
*   **Dispute Resolution:** A system for Job Givers or Installers to raise a "Job Dispute" on a project. Admins can review the dispute thread and mark it as resolved.
*   **Admin Dashboard:** A separate interface for Admins to view all users, all jobs, and manage disputes, coupons, and a platform blacklist.
*   **Role-Based Access Control (RBAC):** The UI and available actions are strictly controlled based on the user's current role (Job Giver, Installer, or Admin).

---

## 3. Technical Stack & Architecture

*   **Framework:** Next.js 14+ with App Router.
*   **Language:** TypeScript.
*   **UI Components:** ShadCN/UI, built on Radix UI and Tailwind CSS.
*   **Styling:** Tailwind CSS. Use `globals.css` for theme variables.
*   **State Management:** React Context and Hooks. No external libraries like Redux.
*   **Forms:** React Hook Form with Zod for validation.
*   **Database:** Firestore (Firebase).
*   **Authentication:** Firebase Authentication (Email/Password).
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
│   │   ├── jobs/            # Browse jobs ([Installer]) & view job details
│   │   ├── my-bids/         # [Installer] View bids they have placed
│   │   ├── post-job/        # [Job Giver] Page to create a new job
│   │   ├── posted-jobs/     # [Job Giver] View jobs they have posted
│   │   ├── profile/         # User's own profile page
│   │   ├── reports/         # Reports page for all roles
│   │   ├── settings/        # App settings page
│   │   └── users/           # [Admin] User directory
│   ├── login/
│   │   └── page.tsx         # Login and Sign Up forms
│   └── layout.tsx           # Root layout
├── ai/
│   ├── flows/               # Genkit flows for AI features
│   │   ├── generate-job-details.ts
│   │   └── ai-assisted-bid-creation.ts
│   └── genkit.ts            # Genkit initialization
├── components/
│   ├── auth/                # Login/Signup forms
│   ├── dashboard/           # Sidebar, Header
│   ├── ui/                  # ShadCN UI components (Button, Card, etc.)
│   └── *.tsx                # Other shared components (e.g., job-card.tsx)
├── hooks/
│   ├── use-user.tsx         # Critical hook for managing auth state and user data
│   ├── use-help.tsx         # Context for the help dialog
│   └── ...                  # Other custom hooks
├── lib/
│   ├── firebase/
│   │   ├── client-provider.ts # Client-side Firebase initialization
│   │   └── seed.ts          # Database seeding script
│   ├── data.ts              # Static data (e.g., skills list)
│   ├── types.ts             # All TypeScript type definitions
│   └── utils.ts             # Utility functions (cn, formatters, etc.)
└── ...
```

---

## 4. UI/UX & Style Guidelines

*   **Primary Color:** `#B0B6C4` (Desaturated grayish-blue)
*   **Background Color:** `#F0F2F5` (Very light grayish-blue)
*   **Accent Color:** `#C88E4D` (Muted amber)
*   **Font:** 'Inter', sans-serif.
*   **Layout:** Clean, modern, with generous whitespace. Use `Card` components for grouping information. Dashboards should use a main content area with a left-hand icon-based sidebar and a top header.
*   **Responsiveness:** The app must be fully responsive and function as a PWA on mobile devices.

---

## 5. Data Models (Firestore)

Define these in `src/lib/types.ts`.

*   **`users` collection:**
    *   **Document ID:** Firebase Auth UID.
    *   **Fields:** `id`, `name`, `email`, `mobile`, `roles` (array of strings: "Job Giver", "Installer", "Admin"), `pincodes` (object: `{residential, office}`), `address` (object), `avatarUrl` (anonymous SVG), `realAvatarUrl` (user-uploaded photo), `memberSince` (Timestamp), `installerProfile` (sub-object for installers), `subscription` (object), `aadharNumber`, `kycAddress`.
*   **`installerProfile` sub-object:**
    *   **Fields:** `tier` ("Bronze", etc.), `points`, `skills` (array of strings), `rating`, `reviews`, `verified` (boolean).
*   **`jobs` collection:**
    *   **Document ID:** `JOB-[YYYYMMDD]-[RANDOM]`.
    *   **Fields:** `id`, `title`, `description`, `jobGiver` (reference to user), `location` (pincode string), `budget` (object: `{min, max}`), `status` ("Open for Bidding", etc.), `deadline` (Timestamp), `postedAt` (Timestamp), `awardedInstaller` (reference to user), `completionOtp`, `disputeId`.
    *   **Sub-collections (embedded as arrays):** `bids` (array of Bid objects), `comments` (array of Comment objects).

---

## 6. Page-by-Page Breakdown

### `app/page.tsx` (Landing Page)
*   **Header:** App logo/name, Login button, Sign Up button.
*   **Content:** A hero section with a clear value proposition, a "Features" section, and a "How It Works" section.
*   **Functionality:** All buttons should link to `/login` with appropriate URL params (`?tab=login` or `?tab=signup`).

### `app/login/page.tsx` (Authentication)
*   **Layout:** A two-tab interface for "Log In" and "Sign Up".
*   **Sign Up Form:** A multi-step process:
    1.  **Role Selection:** "I want to hire" (Job Giver) vs. "I want to work" (Installer).
    2.  **Verification (Installers only):** A mock Aadhar OTP verification screen.
    3.  **Photo Upload:** A step to capture a photo using the device camera or upload a file.
    4.  **Details:** Name, Email, Password, Mobile, Address. For installers, Name and Mobile are pre-filled from the mock KYC.
*   **Login Form:** Standard email and password fields.
*   **Functionality:** Upon successful signup or login, the user is redirected to `/dashboard`.

### `app/dashboard/layout.tsx` (Main Authenticated Layout)
*   **Components:** Renders the persistent `DashboardSidebar` (left) and `Header` (top). The main content area is where child pages are displayed.

### `app/dashboard/page.tsx` (Dashboard Home)
*   **Content:** Displays a different set of summary stats and quick-action cards based on the user's current `role`.
    *   **Installer:** Stats for "Open Jobs", "My Bids", "Jobs Won". Links to "Browse Jobs".
    *   **Job Giver:** Stats for "Active Jobs", "Total Bids", "Completed Jobs". Link to "Post a New Job".
    *   **Admin:** Stats for "Total Users", "Total Jobs", "Open Disputes".

### `app/dashboard/profile/page.tsx` (User Profile)
*   **Content:** Displays user's name, ID, member since, contact info, and roles.
*   **Installer-Specific Content:** If the user is an installer, this page also shows their Reputation card (Tier, Points, Progress bar), Skills list, and star rating.
*   **Functionality:**
    *   Users can edit their basic information (name, pincodes).
    *   Installers can edit their skills list.
    *   A user who is only a "Job Giver" will see a prompt to "Become an Installer".

### `app/dashboard/jobs/page.tsx` (Browse Jobs - Installer)
*   **Layout:** A tabbed interface for "All" and "Recommended" jobs. A filter bar allows searching by pincode, budget, and skills.
*   **Content:** Displays job listings as `JobCard` components.
*   **Functionality:** Clicking a card navigates to the job's detail page `dashboard/jobs/[id]`.

### `app/dashboard/jobs/[id]/page.tsx` (Job Detail)
*   **Layout:** A two-column layout. Left side shows job details, comments, and action forms. Right side shows a summary card.
*   **Content Varies by Role & Status:**
    *   **Open for Bidding:** Shows job info. Installers see a "Place Your Bid" form (with AI assistant). Anyone can see and post public comments.
    *   **Bidding Closed (Job Giver):** The "Place Bid" form is replaced by a list of all bids received. The Job Giver can "Award Job" to one bidder.
    *   **Awarded (Installer):** The awarded installer sees an "Accept Job" / "Decline Job" section.
    *   **In Progress:** The public comments section is replaced by a "Private Messages" thread between the Job Giver and Installer. The Job Giver sees the "Completion OTP". The Installer sees a form to enter the OTP.
    *   **Completed:** Shows a read-only view of the job.

### `app/dashboard/my-bids/page.tsx` (Installer)
*   **Layout:** A table displaying all jobs the installer has bid on.
*   **Content:** Each row shows the Job Title, Bid Amount, Job Status, and a calculated "My Bid Status" (e.g., "Bidded", "Awarded", "Not Selected", "Completed & Won").
*   **Functionality:** A filter dropdown allows viewing bids by status.

### `app/dashboard/posted-jobs/page.tsx` (Job Giver)
*   **Layout:** A tabbed interface for "Active" and "Archived" jobs.
*   **Content:** A table lists all jobs posted by the user. Each row shows Job Title, Status, and number of Bids.
*   **Functionality:** A "Post New Job" button is prominently displayed.

### Admin Pages (`/users`, `/all-jobs`, `/disputes`, etc.)
*   **Layout:** Primarily table-based interfaces for viewing and managing platform data.
*   **Functionality:** Admins can view details of any user or job, manage disputes, and configure platform settings. The `users` and `all-jobs` pages must have robust filtering and sorting capabilities.

---

This detailed prompt provides a clear and comprehensive guide for the AI agent to build the "CCTV Job Connect" application correctly and efficiently.
