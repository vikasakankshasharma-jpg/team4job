# **App Name**: Team4Job

## Core Features:

- **Smart Job Wizard**: A dynamic, category-neutral branching wizard that guides users through technical requirements for 5+ industries (Security, Audio-Visual, Network, etc.).
- **Dual-Role Architecture**: Every user can switch between "Job Giver" and "Installer" seamlessly without logging out.
- **Universal Draft Handler**: Robust system for saving, recovering, and managing job drafts across all categories.
- **Role-Based Access Control**: Secure, partitioned dashboards for Admins, Support, Job Givers, and Installers.
- **Verified Installer Network**: Identity verification (Aadhar/GST) and tier-based reputation system (Bronze to Platinum).
- **Secure Payments**: Cashfree marketplace integration with escrow holding, milestone releases, and automated settlement.
- **Intelligent Pincode Mapping**: Automated post-office lookup with map pinpointing for high-accuracy job locations.
- **AI-Enhanced Scoping**: Gemini-powered job description generation and bid analysis tools.
- **Real-Time Notifications**: Push notifications for jobs, bids, and transaction status updates.
- **Complete Branding**: Fully localized platform with generic terminology ("Hardware", "Quantity", "Service") replacing legacy CCTV strings.

## Style Guidelines (Pixel-Perfect Specs):

- **Primary Color**: Vibrant Blue (`#0066FF`) - Used for key actions, brand elements, and progress indicators.
- **Background**: Clean White (`#F9F9F9`) - Replaced legacy grayish-blue for a more premium, high-contrast feel.
- **Accent**: Success Green (`#16A34A`) - Used for verification badges, confirmation, and growth indicators.
- **Typography**: 'Inter' (sans-serif) - Optimized for readability with specific `rlig` and `calt` settings.
- **Layout**: Mobile-first bottom navigation with a consistent 0.5rem radius design system (`--radius`).
- **Responsive Design**: Pixel-perfect alignment verified across all display sizes (Mobile to 4K Desktop).

## Technical Infrastructure:
- **Framework**: Next.js 15.5+ (App Router).
- **Database**: Firebase Firestore with strict Domain Repository patterns.
- **Monitoring**: Consolidated Sentry integration via `instrumentation` hooks.
- **Localization**: Restructured `en.json` with multi-category support and consolidated admin keys.
