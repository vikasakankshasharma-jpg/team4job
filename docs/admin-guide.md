# Admin User Guide - Team4Job Platform

## Overview

Welcome to the Team4Job Admin System! As an administrator, you have complete control over the platform's operations, user management, content moderation, and configuration. This guide will walk you through all admin features and common workflows.

## Admin Dashboard Overview

### Accessing the Admin Panel

1. Log in to your admin account at `team4job.com/login`
2. Once logged in, you'll be redirected to the Admin Command Center at `/dashboard/admin`
3. All admin pages are accessible from the sidebar navigation

### Admin Pages

- **Admin Command Center** (`/dashboard/admin`) - Platform overview with metrics and alerts
- **Users** (`/dashboard/users`) - Manage all platform users
- **All Jobs** (`/dashboard/all-jobs`) - Monitor and moderate job postings
- **Transactions** (`/dashboard/transactions`) - Transaction oversight and payment monitoring
- **Disputes** (`/dashboard/disputes`) - Dispute resolution and support
- **Reports** (`/dashboard/reports`) - Analytics and platform insights
- **Team** (`/dashboard/team`) - Manage admin and support team members
- **Settings** (`/dashboard/settings`) - Platform configuration

---

## Admin Command Center

The Command Center is your central hub for platform monitoring.

### Key Metrics

**Primary Metrics:**
- **Active Jobs**: Jobs currently in progress, pending confirmation, or pending funding
- **Open Disputes**: Disputes that require immediate attention
- **Total Users**: All registered users on the platform

**Time-Based Metrics:**
- **New Users Today**: Signups since midnight
- **Jobs Posted Today**: New jobs in last 24 hours
- **Jobs This Week**: Jobs posted this week
- **Completed This Week**: Jobs successfully finished this week

### Quick Actions

Use the Quick Actions panel to navigate to common admin tasks:
- **View Users**: Manage all platform users
- **All Jobs**: Monitor job postings
- **Disputes**: Resolve disputes
- **Reports**: View analytics

### Live Safety Alerts

The alerts feed shows real-time notifications for:
- High-value transactions
- Disputed jobs requiring resolution
- Security events and system alerts

**Alert Levels:**
- 🔵 **INFO**: Informational notifications
- 🟡 **WARNING**: Potential issues requiring attention
- 🔴 **CRITICAL**: Urgent issues requiring immediate action

**Filtering Alerts:**
- Use the filter dropdown to view specific alert types
- Select "Unread Only" to see new alerts
- Click "Mark All Read" to clear all unread alerts

**Resolving Disputes from Alerts:**
For alerts with job IDs, you can take immediate action:
- **Release**: Release escrowed funds to installer
- **Refund**: Refund payment to job giver
- **Split 50/50**: Split funds equally between parties

---

## User Management

### Viewing Users

1. Navigate to `/dashboard/users`
2. All registered users are displayed in the table
3. Use the search bar to find users by name, email, or unique ID

### Filtering Users

Apply filters to find specific users:
- **Role**: Admin, Installer, Job Giver, Support Team
- **Tier**: Bronze, Silver, Gold, Platinum (for installers)
- **Verified**: Email/mobile verification status
- **Rating**: Filter by user ratings
- **Status**: Active, suspended, deactivated

### User Actions

**For Individual Users:**
1. Click on a user's name to view their full profile
2. From the user profile, you can:
   - Suspend or activate the account
   - Add admin notes (visible only to admins)
   - Verify installer status manually
   - Grant subscription access
   - View activity timeline

**Suspending a User:**
1. Click "Suspend User" on their profile or in the users table
2. Choose suspension duration (7, 14, 30 days, or permanent)
3. Add a reason for the suspension
4. Confirm the action

**Bulk Actions:**
1. Select multiple users using checkboxes
2. Click "Bulk Actions" dropdown
3. Choose action (Suspend, Activate, Export)

### Exporting User Data

1. Apply desired filters
2. Click "Export CSV" button
3. Download the CSV file with filtered user data

---

## Job Monitoring

### Viewing All Jobs

1. Navigate to `/dashboard/all-jobs`
2. All platform jobs are displayed with key details

### Filtering Jobs

- **Status**: Open, In Progress, Completed, Cancelled
- **Type**: Installation type (CCTV, Access Control, etc.)
- **Date Range**: Filter by creation date
- **Pincode**: Filter by location
- **Budget Range**: Filter by job value

### Job Moderation

**Flagging Jobs:**
1. Click the flag icon on a job
2. Select reason (suspicious pricing, incomplete details, etc.)
3. Job is marked for review

**Deleting Jobs:**
1. Click on job ID to view details
2. Click "Delete Job" (only for policy violations)
3. Confirm deletion (irreversible)

**Contacting Job Givers:**
1. From job details, click "Contact Job Giver"
2. Send email notification or message

---

## Transaction Oversight

### Viewing Transactions

1. Navigate to `/dashboard/transactions`
2. All payment transactions are displayed

### Transaction Filters

- **Status**: Pending, Completed, Failed, Refunded
- **Date Range**: Filter by transaction date
- **Amount Range**: Filter by transaction value

### Financial Summary

View key financial metrics:
- Total revenue this month
- Platform commission earned
- Pending transactions
- Failed transactions

### Refund Processing

1. Click on transaction to view details
2. Click "Process Refund"
3. Enter refund amount (full or partial)
4. Add refund reason
5. Confirm refund (irreversible)

---

## Dispute Resolution

### Viewing Disputes

1. Navigate to `/dashboard/disputes`
2. All disputes are listed with priority indicators

### Dispute Priority

Disputes are auto-prioritized by:
- Amount involved (higher amount = higher priority)
- Time open (older disputes = higher priority)
- Escalation level

### Resolving Disputes

1. Click on dispute to view full details
2. Review communication thread between parties
3. Review job details and payment information
4. Choose resolution:
   - **Release**: Pay installer (job completed satisfactorily)
   - **Refund**: Refund job giver (job not completed or unsatisfactory)
   - **Split 50/50**: Compromise solution for partial completion
5. Add resolution notes
6. Confirm resolution (irreversible)

### Using Resolution Templates

For common dispute types, select from predefined templates:
-  No-show installer → Refund
- Partial completion → Split
- Completed as agreed → Release

---

## Reports & Analytics

### Accessing Reports

Navigate to `/dashboard/reports` to view platform analytics.

### Key Performance Indicators (KPIs)

- **User Growth**: New signups over time
- **Job Volume**: Jobs posted and completed
- **Revenue**: Platform earnings and commission
- **Conversion Rates**: Signup → verification, job post → award

### Top Performers

View leaderboards for:
- Top installers by jobs completed
- Top installers by rating
- Top installers by revenue

### Exporting Reports

1. Select date range
2. Choose data type (Users, Jobs, Transactions, Disputes)
3. Click "Export" to download CSV

---

## Team Management

### Adding Team Members

1. Navigate to `/dashboard/team`
2. Click "Add Team Member"
3. Enter details:
   - Name
   - Email
   - Temporary password
   - Role (Admin or Support Team)
4. Click "Create Account"
5. Team member receives email with login credentials

### Role Permissions

**Admin:**
- Full access to all platform features
- Can manage users, jobs, transactions, settings
- Can add/remove team members
- Can process refunds and resolve disputes
- Can configure platform settings (monetization, reputation, rules)
- Complete financial oversight

**Support Team:**
- Limited, view-focused access for customer support
- **Can View** (Read-Only): Users, Jobs, Transactions
- **Can Manage**: Disputes (view, edit, resolve)
- **Cannot Access**: Platform settings, team management, financial configuration
- Focus: Customer support and dispute resolution

---

## Platform Settings

### Accessing Settings

Navigate to `/dashboard/settings` to configure platform parameters.

### Monetization Settings

**Commission & Fees:**
- **Installer Commission Rate**: Percentage taken from installer earnings
- **Job Giver Fee Rate**: Convenience fee charged to job givers

**Subscription Plans:**
- Create, edit, and delete subscription tiers
- Set pricing, features, and durations

**Coupons:**
- Create promotional coupons
- Set discount amounts and validity periods
- Track coupon usage

### Reputation System

**Points Configuration:**
- Points for job completion
- Points for 5-star ratings
- Penalties for 1-star ratings
- Penalties for declined jobs

**Tier Thresholds:**
- Bronze: Default (0 points)
- Silver: Set point threshold
- Gold: Set point threshold
- Platinum: Set point threshold

### Platform Rules

**Job Posting Rules:**
- Minimum job budget
- Auto-verify installers toggle
- Content moderation settings

**Blacklist Management:**
- Add users or pincodes to blacklist
- Set blacklist reasons and duration
- Remove from blacklist

---

## Common Admin Workflows

### Onboarding a New Installer

1. New installer signs up
2. Admin receives notification in Command Center
3. Navigate to `/dashboard/users`, search for installer
4. Click on installer name to view profile
5. Review verification documents
6. Click "Verify Installer" if documents are valid
7. Add admin note: "Manually verified - documents reviewed"

### Handling a Disputed Job

1. Alert appears in Admin Command Center
2. Click alert or navigate to `/dashboard/disputes`
3. Click on dispute to view details
4. Review both parties' messages and evidence
5. Check job details and payment amount
6. Choose resolution based on evidence:
   - **Job completed**: Click "Release" to pay installer
   - **Job not done**: Click "Refund" to refund job giver
   - **Partial work**: Click "Split 50/50" for compromise
7. Add resolution notes explaining decision
8. Confirm action

### Monthly Platform Review

1. Navigate to `/dashboard/reports`
2. Select "Last 30 Days" date range
3. Review KPIs:
   - User growth trend
   - Job completion rate
   - Revenue and commission
4. Check top performers
5. Export data for records
6. Identify any issues or trends requiring attention

### Suspending a Problematic User

1. Navigate to `/dashboard/users`
2. Search for user by name or email
3. Click on user to view profile
4. Click "Suspend User"
5. Select suspension duration
6. Add reason: "Violation of terms - [specific issue]"
7. Confirm suspension
8. User is immediately blocked from platform access

---

## Security Best Practices

1. **Use Strong Passwords**: Set a strong, unique password for your admin account
2. **Log Out After Sessions**: Always log out when finished, especially on shared devices
3. **Review Audit Logs**: Regularly check admin action logs in Settings
4. **Verify Team Members**: Only add trusted individuals to the admin team
5. **Be Cautious with Irreversible Actions**: Dispute resolutions, refunds, and deletions cannot be undone
6. **Document Decisions**: Add admin notes when taking significant actions
7. **Monitor Alerts**: Check the Command Center daily for critical alerts

---

## Troubleshooting

### "Permission Denied" Errors

**Solution**: Ensure you're logged in with an Admin role account. Support Team members have limited access.

### Metrics Not Loading

**Solution**: Check platform health indicator. If showing "System Issues", refresh the page or contact technical support.

### Export Not Downloaded

**Solution**: Check your browser's download folder. Disable pop-up blocker if needed.

### User Profile Won't Load

**Solution**: Refresh the page. If issue persists, check if user still exists in system.

##

 Need Help?

For technical issues or questions about the admin system:
- Contact: `admin@team4job.com`
- Document any bugs or issues you encounter during Alpha testing
- Provide feedback on admin features via the feedback form

---

*Last Updated: January 2026 for Alpha Testing Launch*
