# Admin Quick Reference Guide - Team4Job

## Quick Links

- **Admin Command Center**: `/dashboard/admin`
- **User Management**: `/dashboard/users`
- **All Jobs**: `/dashboard/all-jobs`
- **Transactions**: `/dashboard/transactions`
- **Disputes**: `/dashboard/disputes`
- **Reports & Analytics**: `/dashboard/reports`
- **Team Management**: `/dashboard/team`
- **Platform Settings**: `/dashboard/settings`

---

## Common Actions Cheat Sheet

### User Management

**Find a User:**
```
1. Go to /dashboard/users
2. Type name/email in search box
3. Or use filters (role, tier, status)
```

**Suspend User:**
```
1. Click user name → View profile
2. Click "Suspend User"
3. Choose duration → Confirm
```

**Verify Installer:**
```
1. Find installer in /dashboard/users
2. Click name → View profile
3. Click "Verify Installer" → Confirm
```

**Export Users:**
```
1. Apply desired filters
2. Click "Export CSV"
```

---

### Job Monitoring

**View All Jobs:**
```
/dashboard/all-jobs
```

**Filter Jobs:**
```
- By Status: Open, In Progress, Completed
- By Type: Installation type
- By Date: Date range picker
- By Location: Pincode filter
```

**Flag Job for Review:**
```
1. Click flag icon on job
2. Select reason
3. Job marked for review
```

---

### Dispute Resolution

**Resolve Dispute:**
```
1. Go to /dashboard/disputes
2. Click dispute → Review details
3. Choose: Release / Refund / Split 50/50
4. Add notes → Confirm
```

**Quick Resolution from Alerts:**
```
1. Admin Command Center shows alert
2. Click Release/Refund/Split button
3. Confirm action
```

---

### Transactions

**View Transaction:**
```
1. Go to /dashboard/transactions
2. Search by ID or filter
3. Click to view details
```

**Process Refund:**
```
1. Click transaction → "Process Refund"
2. Enter amount → Add reason
3. Confirm (irreversible!)
```

---

### Team Management

**Add Admin/Support:**
```
1. Go to /dashboard/team
2. Click "Add Team Member"
3. Fill form → Choose role → Create
```

---

### Reports

**View Analytics:**
```
1. Go to /dashboard/reports
2. Select date range
3. View KPIs and charts
```

**Export Data:**
```
1. Choose data type (Users/Jobs/Transactions)
2. Click "Export"
3. Download CSV
```

---

### Settings

**Change Commission Rates:**
```
1. /dashboard/settings → Monetization tab
2. Update rates → Save
```

**Manage Subscriptions:**
```
1. /dashboard/settings → Monetization tab
2. Subscription Plans section
3. Create/Edit/Delete plans
```

**Configure Reputation:**
```
1. /dashboard/settings → User & Reputation tab
2. Set points and tier thresholds
3. Save changes
```

**Manage Blacklist:**
```
1. /dashboard/settings → Platform Rules tab
2. Blacklist Manager section
3. Add/Remove entries
```

---

## Metrics Explained

| Metric | Meaning |
|--------|---------|
| Active Jobs | Jobs in progress/pending confirmation/pending funding |
| Open Disputes | Disputes awaiting resolution |
| Total Users | All registered users |
| New Users Today | Signups since midnight |
| Jobs Posted Today | New jobs in last 24 hours |
| Jobs This Week | Jobs posted this week |
| Completed This Week | Jobs finished this week |

---

## Alert Levels

| Level | Icon | Meaning |
|-------|------|---------|
| INFO | 🔵 | Informational notification |
| WARNING | 🟡 | Needs attention soon |
| CRITICAL | 🔴 | Requires immediate action |

---

## User Roles

| Role | Access Level |
|------|--------------|
| Admin | Full platform access |
| Support Team | Disputes + limited read access |
| Job Giver | Post jobs, hire installers |
| Installer | Bid on jobs, complete work |

---

## Installer Tiers

| Tier | Requirement |
|------|-------------|
| Bronze | 0+ points (default) |
| Silver | 500+ points |
| Gold | 1000+ points |
| Platinum | 2000+ points |

*Configure thresholds in Settings → User & Reputation*

---

## Quick Tips

✅ **Always add admin notes** when taking significant actions  
✅ **Double-check before irreversible actions** (refunds, deletions)  
✅ **Monitor alerts daily** for critical issues  
✅ **Export data regularly** for backup/analysis  
✅ **Review top performers** to identify quality installers  
✅ **Check financial summary** monthly for revenue tracking  
✅ **Use filters** to find specific users/jobs/transactions quickly  
✅ **Document dispute resolutions** with clear notes  

---

## Troubleshooting Quick Fixes

**Can't see a page?** → Check you're logged in as Admin  
**Metrics not loading?** → Refresh page, check platform health  
**Export not downloading?** → Check browser downloads, disable pop-up blocker  
**User profile won't load?** → User may have been deleted  

---

## Emergency Contacts

- **Technical Issues**: `admin@team4job.com`
- **Billing Questions**: `billing@team4job.com`
- **Security Concerns**: `security@team4job.com`

---

*Quick Reference v1.0 - Alpha Testing*
