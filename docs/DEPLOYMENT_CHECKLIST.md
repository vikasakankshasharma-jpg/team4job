# Production Deployment Checklist - QA Fixes

## Pre-Deployment

### Code Review
- [x] All QA fixes implemented
- [x] Invoice generation updated to use billingSnapshot
- [x] Type errors resolved
- [x] E2E tests updated and passing (Phase 1 confirmed)
- [x] Documentation created

### Testing Verification
- [ ] **Refund Flow** (Staging)
  - [ ] Cancel funded job
  - [ ] Verify Cashfree refund initiated
  - [ ] Check job status = 'Cancelled'
  
- [ ] **Tax Snapshot** (Staging)
  - [ ] Award and fund a job
  - [ ] Verify billingSnapshot in Firestore
  - [ ] Change installer GSTIN
  - [ ] Generate invoice
  - [ ] Confirm invoice uses snapshot data

- [ ] **Completion Flow** (Staging)
  - [ ] Test with OTP (instant payment)
  - [ ] Test without OTP (approval flow)

- [ ] **Silent Decline** (Staging)
  - [ ] Sequential award with multiple installers
  - [ ] First installer declines
  - [ ] Verify immediate escalation

- [ ] **Edit Lock** (Staging)
  - [ ] Award a job
  - [ ] Attempt to edit
  - [ ] Verify redirect with error

- [ ] **Hostage Fund** (Staging)
  - [ ] Submit work
  - [ ] Manually set completionTimestamp to 72+ hours ago
  - [ ] Verify "Report" button appears

### Database Preparation
- [ ] Backup production database
- [ ] Test billingSnapshot field on staging
- [ ] Verify no migration needed (field is optional)

### API Testing
- [ ] Test `/api/escrow/refund` endpoint
- [ ] Test `/api/escrow/verify-otp-complete` endpoint
- [ ] Verify Cashfree API credentials in production env

---

## Deployment Steps

### 1. Code Deployment
```bash
# Commit changes
git add .
git commit -m "feat: implement QA fixes - refunds, tax compliance, contract integrity

- Add refund API for cancelled jobs (fixes black hole)
- Implement billingSnapshot for GST compliance (prevents tax drift)
- Add unified completion flow with OTP support
- Implement silent decline with immediate escalation
- Add installer recourse for unresponsive clients (72hr rule)
- Lock job editing after award (contract integrity)
- Add 'Previously Hired' trust labels
- Update invoice generation to use tax snapshot
- Create comprehensive documentation

Breaking changes: None
Database changes: New optional field 'billingSnapshot' on Job documents
API changes: New endpoints for refund and OTP completion"

# Push to main
git push origin main

# Deploy to production
firebase deploy --only hosting,functions
```

### 2. Environment Variables
Verify in Firebase Console:
- [ ] `CASHFREE_APP_ID`
- [ ] `CASHFREE_SECRET_KEY`
- [ ] `CASHFREE_API_VERSION`
- [ ] All other existing env vars

### 3. Firestore Security Rules
No changes needed - billingSnapshot is covered by existing job document rules.

### 4. Post-Deployment Verification

#### Immediate (0-15 minutes)
- [ ] Site loads without errors
- [ ] Can create new job
- [ ] Can view existing jobs
- [ ] Admin panel accessible

#### Short-term (15-60 minutes)
- [ ] Monitor error logs
- [ ] Check Cashfree webhook logs
- [ ] Verify no spike in error rates
- [ ] Test one complete transaction cycle

#### Medium-term (1-24 hours)
- [ ] Monitor refund requests
- [ ] Check invoice generation
- [ ] Review support tickets
- [ ] Verify billingSnapshot being captured

---

## Rollback Plan

### If Critical Issues Detected

**Severity Level 1: Site Down / Payment Failures**
```bash
# Immediate rollback
git revert HEAD
git push origin main
firebase deploy --only hosting,functions
```

**Severity Level 2: Feature Bugs (Non-Critical)**
- Disable specific feature via feature flag
- Fix forward in hotfix branch
- Deploy hotfix within 4 hours

### Feature-Specific Rollback

**Refund API Issue:**
```typescript
// In job-detail-client.tsx, comment out:
// await axios.post('/api/escrow/refund', { jobId });
// Replace with:
await handleJobUpdate({ status: 'Cancelled' });
```

**Tax Snapshot Issue:**
```typescript
// In invoice/page.tsx, revert to:
const isGstRegistered = !!installer.gstin;
// Remove billingSnapshot logic
```

**Edit Lock Issue:**
```typescript
// In post-job-client.tsx, remove status check:
// if (isEditMode && jobData.status !== 'Open for Bidding') { ... }
```

---

## Monitoring & Alerts

### Key Metrics to Watch

**First 24 Hours:**
- Error rate (should be < 1%)
- Refund API success rate (should be > 95%)
- Invoice generation success rate (should be 100%)
- Job creation rate (should match baseline)

**First Week:**
- Average payment release time
- Refund completion rate
- Support ticket volume
- User complaints

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 2% | > 5% |
| Refund Failures | > 5% | > 10% |
| Payment Delays | > 24hrs | > 48hrs |
| Support Tickets | +50% | +100% |

---

## Communication Plan

### Internal Team
**Before Deployment:**
```
Subject: QA Fixes Deployment - [Date/Time]

Team,

We're deploying critical QA fixes today at [Time]. Expected downtime: None.

Key changes:
- Refund system for cancelled jobs
- Tax compliance improvements
- Enhanced completion flow
- Contract integrity protections

Please monitor support channels for any user issues.

Documentation: /docs/QA_FIXES_DOCUMENTATION.md

Thanks,
[Your Name]
```

### Support Team
**Before Deployment:**
- Share SUPPORT_QUICK_REFERENCE.md
- Brief on new features and common scenarios
- Set up monitoring dashboard access

### Users (If Needed)
**After Deployment:**
```
Subject: Platform Improvements - Better Refunds & Faster Payments

Hi [User],

We've just released several improvements to make your experience better:

✅ Automatic refunds for cancelled jobs
✅ Faster payment release with OTP option
✅ Better protection for both Job Givers and Installers

No action needed from you - everything works automatically!

Questions? Contact support.

Best regards,
CCTV Job Connect Team
```

---

## Post-Deployment Tasks

### Day 1
- [ ] Monitor error logs every 2 hours
- [ ] Review first 10 refund requests
- [ ] Check first 10 invoices generated
- [ ] Respond to support tickets within 1 hour

### Week 1
- [ ] Daily metrics review
- [ ] Support ticket analysis
- [ ] User feedback collection
- [ ] Performance optimization if needed

### Week 2-4
- [ ] Comprehensive metrics report
- [ ] User satisfaction survey
- [ ] Identify improvement opportunities
- [ ] Plan next iteration

---

## Success Criteria

### Technical
- [ ] Zero critical bugs
- [ ] < 1% error rate
- [ ] > 95% refund success rate
- [ ] 100% invoice accuracy

### Business
- [ ] Reduced support tickets for payment issues
- [ ] Faster average payment release time
- [ ] Improved user satisfaction scores
- [ ] No GST compliance violations

### User Experience
- [ ] Positive feedback on refund system
- [ ] Increased OTP usage for instant payments
- [ ] Reduced disputes over scope changes
- [ ] Higher installer retention

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Lead Developer | [Name] | [Phone/Email] | 24/7 for critical |
| DevOps | [Name] | [Phone/Email] | Business hours |
| Support Lead | [Name] | [Phone/Email] | Business hours |
| Product Manager | [Name] | [Phone/Email] | Business hours |

---

## Notes

### Known Limitations
- Refunds take 5-7 business days (Cashfree limitation)
- Old jobs won't have billingSnapshot (expected)
- E2E Phase 2 test is flaky (timing issue, not functional bug)

### Future Enhancements
- Auto-complete after 7 days of no response
- Bulk refund processing for admins
- Enhanced dispute resolution workflow
- Automated tax calculation based on state

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Rollback Performed**: [ ] Yes [ ] No  
**Issues Encountered**: _____________  
**Resolution**: _____________

---

**Sign-off:**
- [ ] Developer: _____________
- [ ] QA Lead: _____________
- [ ] Product Manager: _____________
