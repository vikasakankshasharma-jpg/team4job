# Post-Launch Tasks Guide

This document provides step-by-step instructions for completing the remaining operational tasks after your initial launch.

## Required Before Launch

### 🔴 Critical: Create Firestore Indexes

Before your first production deployment, you **must** create the Firestore composite indexes:

1. Visit [Firestore Index Creator - Index 1](https://console.firebase.google.com/project/dodo-beta/firestore/indexes?create_composite=Cm5wcm9qZWN0cy9kb2RvLWJldGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3RyYW5zYWN0aW9ucy9pbmRleGVzL18QARoMCghqb2JHSXZLCIABEQ)
2. Visit [Firestore Index Creator - Index 2](https://console.firebase.google.com/project/dodo-beta/firestore/indexes?create_composite=Cm5wcm9qZWN0cy9kb2RvLWJldGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3RyYW5zYWN0aW9ucy9pbmRleGVzL18QARoNCglpbnN0YWxsZXIQABoMCghjcmVhdGVkQXQSAQ)
3. Click "Create Index" on each page
4. Wait 5-10 minutes for indexes to build

---

## Optional: Sentry Error Tracking

Sentry is already configured in the codebase. To enable it:

### Step 1: Create Sentry Account
1. Go to [sentry.io](https://sentry.io)
2. Sign up for free tier (5,000 errors/month)
3. Create a new project for "Team4Job"
4. Choose "Next.js" as the platform

### Step 2: Get Your DSN
You already have: `https://80804373cc5c48b160dc622c548d35cd@o4510628917805056.ingest.us.sentry.io/4510628926455808`

This is already in your `.env.local` file. ✅

### Step 3: Test Locally
```bash
# Start dev server
npm run dev

# Trigger a test error
# Visit http://localhost:3000 and open browser console
# Type: throw new Error("Test Sentry")

# Check Sentry dashboard for the error
```

### Step 4: Add to GitHub Secrets
For automated deployments:

1.Go to GitHub repo: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add:
   - Name: `SENTRY_AUTH_TOKEN`
   - Value: (Get from Sentry: Settings → Auth Tokens → Create New Token)
   - Scopes: `project:releases`, `org:read`

---

## Optional: Uptime Monitoring

Recommended after launch to get alerts if the site goes down.

### Step 1: Create UptimeRobot Account
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for free tier (50 monitors)

### Step 2: Add Monitor
1. Click "Add New Monitor"
2. Monitor Type: **HTTP(s)**
3. Friendly Name: `Team4Job Production`
4. URL: `https://dodo-beta.web.app`
5. Monitoring Interval: **5 minutes**
6. Click "Create Monitor"

### Step 3: Configure Alerts
1. Go to "My Settings"
2. Add Alert Contacts:
   - Email: your email
   - SMS: your phone (optional)
3. Enable notifications

### Step 4: Add Status Badge (Optional)
```markdown
# Add to README.md
[![Uptime Status](https://img.shields.io/uptimerobot/status/YOUR_MONITOR_ID)](https://stats.uptimerobot.com/YOUR_STATUS_PAGE)
```

---

## Post-Launch: Staging Environment

These tasks are for creating a staging environment for testing before production.

### Why You Might Want This
- Test new features before deploying to production
- Try risky updates safely
- Give clients/stakeholders a preview environment

### Setup Steps (When Needed)

#### 1. Create Staging Firebase Project
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Create new project via console.firebase.google.com
# Name it: dodo-staging
```

#### 2. Duplicate Configuration
1. Copy all Firebase services (Auth, Firestore, Storage) from `dodo-beta` to `dodo-staging`
2. Copy security rules to new project
3. Create indexes in new project

#### 3. Create Staging Environment Variables
```bash
# Create .env.staging
cp .env.local .env.staging

# Update Firebase config to use dodo-staging
# Update NEXT_PUBLIC_FIREBASE_PROJECT_ID=dodo-staging
```

#### 4. Create GitHub Actions Workflow
Create `.github/workflows/staging-deploy.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      # ... Similar to ci-cd.yml but deploy to dodo-staging
```

---

## Required: Legal Review

### Privacy Policy & Terms of Service

Your legal documents are already created and live at:
- https://dodo-beta.web.app/privacy-policy
- https://dodo-beta.web.app/terms-of-service

**What You Need:**
1. **Hire a lawyer** specializing in Indian Cyber Law / DPDP Act
2. Provide them with the live URLs above
3. Ask them to review for:
   - DPDP Act 2023 compliance
   - Payment processing disclosures
   - User data handling
   - Dispute resolution clauses

**Cost Estimate:** ₹5,000 - ₹15,000 per document

**Timeline:** 1-2 weeks

**Alternative:** Use online services like:
- LegalDesk.com
- Vakilsearch.com
- IndiaFilings.com

### DPDP Act Compliance

Ensure your lawyer confirms:
- ✅ Consent mechanisms (cookie banner)
- ✅ Data processing notices
- ✅ User rights (access, deletion, correction)
- ✅ Data retention policies
- ✅ Breach notification procedures

---

## Summary: What's Required vs Optional

### ✅ Must-Do Before Launch
- [x] Sentry DSN configured
- [x] Firebase Blaze plan active
- [ ] **Firestore Indexes created** (5 minutes)

### ⚠️ Recommended Within 1 Week
- [ ] Legal review completed
- [ ] Uptime monitoring configured

### 📋 Nice-to-Have (Post-Launch)
- [ ] Sentry error tracking tested
- [ ] Staging environment created
- [ ] Status page for users

---

## Quick Actions

**Ready to launch today?**
```bash
# 1. Create those Firestore indexes (links above)
# 2. Run pre-flight check
npm run predeploy

# 3. Deploy
git push origin main
# OR
firebase deploy
```

**Want full observability?**
1. Create UptimeRobot account (5 minutes)
2. Test Sentry locally (10 minutes)
3. Schedule legal review call (1 hour)

**Questions?**
Refer to `DEPLOYMENT.md` for deployment specifics.
