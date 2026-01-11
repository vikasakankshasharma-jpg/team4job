# Deployment Guide (v1.0.0)

This guide walks you through the final steps to deploy your production-ready Team4Job application.

## Prerequisites

- [ ] **Firebase Blaze Plan**: Required for SMS (OTP) and Cloud Functions.
- [ ] **Sentry Account**: For error tracking.

## 1. Environment Configuration

Ensure your `.env.local` (and your cloud environment variables) has the following:

```env
# Existing
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
...

# New (Required for v1.0.0)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxx
```

## 2. Infrastructure Setup (One-Time)

### Create Firestore Indexes
Run these links to create required indexes for performance:
- [Create Job Index](https://console.firebase.google.com/v1/r/project/dodo-beta/firestore/indexes?create_composite=CkZwcm9qZWN0cy9kb2RvLWJldGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2pvYnMvaW5kZXhlcy9fEAEaDgoKam9iR2l2ZXJJZBABGgwKCHBvc3RlZEF0EAIaDAoIX19uYW1lX18QAg)
- [Create Transaction Index](https://console.firebase.google.com/v1/r/project/dodo-beta/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9kb2RvLWJldGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3RyYW5zYWN0aW9ucy9pbmRleGVzL18QARoLCgdwYXllcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg)

## 3. Pre-Flight Check

Run the automated check script to verify your local environment:

```bash
npm run predeploy
```

## 4. Deploy

### Option A: Vercel (Recommended)
Connect your GitHub repository to Vercel. It will automatically detect the Next.js app.
- Add Environment Variables in Vercel Settings.
- Redeploy.

### Option B: Firebase App Hosting
```bash
firebase deploy
```

---

## Post-Launch Verification

1.  **Log in** as a Job Giver.
2.  **Post a Job** and verify you receive an SMS OTP (if configured) or see the job in the dashboard.
3.  **Check Sentry** to ensure no errors are reported during the flow.

**Support**: Contact the development team (Antigravity) for issues!
