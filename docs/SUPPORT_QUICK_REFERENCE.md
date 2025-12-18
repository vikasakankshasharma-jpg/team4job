# Support Team Quick Reference - QA Fixes

## 🚨 Emergency Contacts
- **Developer On-Call**: [Contact]
- **Admin Dashboard**: `/dashboard` (Admin role required)
- **Cashfree Dashboard**: [Link]

---

## 📋 Common Issues & Solutions

### 1. "My refund hasn't arrived" (Job Giver)

**Check:**
1. Job status in database: Should be 'Cancelled'
2. Cashfree dashboard: Search by job ID for refund transaction
3. Timeline: Refunds take 5-7 business days from cancellation

**Response Template:**
```
Hi [Name],

I've checked your cancellation for Job [ID]. The refund was initiated on [Date] and should arrive in your account within 5-7 business days from that date.

Current status: [Pending/Processing/Completed]

If you don't receive it by [Date + 7 days], please reply to this message and we'll escalate to our payment processor.

Best regards,
Support Team
```

**Escalation:** If 7+ days passed and no refund, escalate to developer with Cashfree transaction ID.

---

### 2. "Payment stuck - Job Giver not responding" (Installer)

**Check:**
1. Job status: Should be 'Pending Confirmation'
2. Completion timestamp: Calculate hours since submission
3. "Report Unresponsive Client" button: Should appear after 72 hours

**If < 72 hours:**
```
Hi [Name],

I understand the wait is frustrating. Our policy requires 72 hours for Job Givers to review completed work before we can intervene.

Your work was submitted on [Date/Time]. You'll be able to report this issue on [Date/Time + 72h].

In the meantime, I recommend sending a polite follow-up message to the Job Giver via the job's private messages.

Best regards,
Support Team
```

**If 72+ hours:**
1. Review submitted work (photos, completion notes)
2. Check job description vs. delivered work
3. Review communication history
4. **If work appears satisfactory:**
   - Manually release payment via admin panel
   - Notify both parties
5. **If unclear/disputed:**
   - Create formal dispute
   - Request additional evidence from both parties

**Admin Action (Payment Release):**
```sql
-- In Firestore Console or Admin SDK
UPDATE jobs 
SET status = 'Completed',
    paymentReleased = true,
    paymentReleasedAt = NOW()
WHERE id = 'JOB-XXXXXXXX'
```

---

### 3. "Installer changed the job scope" (Job Giver)

**Check:**
1. Navigate to job detail page
2. Look for "Additional Tasks" section
3. Check if scope change was mutual (via Additional Tasks flow)

**If Additional Task exists:**
```
Hi [Name],

I've reviewed the job. The scope change was handled through our "Additional Tasks" feature, which requires your approval before any additional payment.

Status: [Pending Quote / Quoted / Approved / Declined]

If you didn't approve this, please let me know and we'll investigate further.

Best regards,
Support Team
```

**If unilateral change (no Additional Task):**
- This is a violation of platform terms
- Create dispute
- Freeze installer account pending investigation
- Offer Job Giver option to reject work or negotiate

---

### 4. "Invoice shows wrong tax amount" (Job Giver or Installer)

**Check:**
1. Open job in Firestore
2. Look for `billingSnapshot` field
3. Compare GSTIN in snapshot vs. current installer profile

**If billingSnapshot exists:**
```
Hi [Name],

I've reviewed the invoice. The tax details shown are correct based on the installer's information at the time the job was awarded (not current information).

This is required for GST compliance - invoices must reflect the tax registration status at the time of the transaction.

Snapshot Details:
- GSTIN: [From snapshot]
- Captured on: [Job award date]

Current Installer GSTIN: [From profile]

If you believe there's an error in the snapshot itself, please provide documentation and we'll investigate.

Best regards,
Support Team
```

**If billingSnapshot missing (old job):**
```
This job was completed before our tax snapshot feature was implemented. The invoice uses the installer's current tax details, which may differ from the time of service.

For future jobs, tax details are now locked at the time of job award to ensure compliance.
```

---

### 5. "Can't edit my job after awarding" (Job Giver)

**This is expected behavior:**

```
Hi [Name],

Once a job is awarded to an installer, editing is disabled to protect both parties from unilateral contract changes.

To make changes:

1. **Scope Changes**: Use the "Additional Tasks" feature on the job page
   - Installer will provide a quote
   - You approve/decline
   - Payment handled separately

2. **Date Changes**: Use "Propose Date Change"
   - Requires installer's agreement
   - No additional payment

3. **Major Changes**: Cancel and repost
   - Refund will be issued
   - Create new job with updated details

Need help with any of these? Let me know!

Best regards,
Support Team
```

---

### 6. "Installer declined my offer - what now?" (Job Giver)

**Check:**
1. Job status: Should be 'Awarded' (if more installers remain) or 'Bidding Closed' (if none remain)
2. `selectedInstallers` array: Check next ranked installer
3. `acceptanceDeadline`: Should be reset to 24 hours from decline

**If escalated to next installer:**
```
Hi [Name],

The installer declined your offer. The job has been automatically offered to the next ranked installer from your selection.

Next Installer: [Anonymous ID or name if revealed]
New Acceptance Deadline: [Date/Time]

You'll be notified when they accept or decline.

Best regards,
Support Team
```

**If no installers remain:**
```
Hi [Name],

Unfortunately, all selected installers have declined. The job is now closed for bidding.

Options:
1. Repost the job with adjusted terms (budget, timeline, etc.)
2. Browse installers and send direct requests
3. Contact support for help finding suitable installers

Would you like assistance with any of these?

Best regards,
Support Team
```

---

## 🔧 Admin Tools & Actions

### Manually Release Payment

**When to use:**
- Job Giver unresponsive for 72+ hours
- Work clearly completed satisfactorily
- No disputes or quality concerns

**How:**
1. Navigate to job in admin panel
2. Review completion evidence
3. Click "Force Complete & Release Payment"
4. Add admin note explaining action
5. Notify both parties

### Create Dispute

**When to use:**
- Conflicting claims about work quality
- Scope disagreement
- Payment/refund issues

**How:**
1. Navigate to Disputes section
2. Click "Create Dispute"
3. Select job
4. Add initial notes
5. Request evidence from both parties
6. Set review deadline

### Issue Manual Refund

**When to use:**
- Cashfree refund failed
- Special circumstances (platform error, etc.)

**How:**
1. Process refund through Cashfree dashboard
2. Update job status in Firestore
3. Add transaction record
4. Notify Job Giver

---

## 📊 Monitoring & Metrics

### Daily Checks
- [ ] Refunds pending > 7 days
- [ ] Jobs in "Pending Confirmation" > 72 hours
- [ ] Disputes awaiting admin review
- [ ] Failed payment transactions

### Weekly Reports
- Refund success rate
- Average payment release time
- Dispute resolution time
- Edit lock violations

---

## 🆘 Escalation Matrix

| Issue | Severity | Escalate To | Timeline |
|-------|----------|-------------|----------|
| Payment not released (72+ hrs) | High | Admin Panel Action | Immediate |
| Refund failed | High | Developer + Cashfree | 24 hours |
| Tax compliance question | Medium | Developer | 48 hours |
| Feature request | Low | Product Team | Next sprint |
| Bug report | Varies | Developer | Based on impact |

---

## 📞 Contact Templates

### Requesting Evidence (Dispute)
```
Hi [Name],

To help resolve this issue, please provide:

1. [Specific evidence needed]
2. [Additional documentation]
3. [Timeline/dates]

Please submit within 48 hours. If we don't receive this information, we'll proceed based on available evidence.

Best regards,
Support Team
```

### Dispute Resolution
```
Hi [Name],

After reviewing all evidence, we've reached a decision:

[Decision]

Reasoning:
[Explanation]

Action taken:
[Payment released / Refund issued / Other]

If you disagree with this decision, you may appeal within 7 days by replying to this message with additional evidence.

Best regards,
Support Team
```

---

## 🔍 Useful Database Queries

### Find Jobs Pending Confirmation > 72 Hours
```javascript
// Firestore query
db.collection('jobs')
  .where('status', '==', 'Pending Confirmation')
  .where('completionTimestamp', '<', Date.now() - (72 * 60 * 60 * 1000))
  .get()
```

### Check Refund Status
```javascript
// Firestore query
db.collection('jobs')
  .where('id', '==', 'JOB-XXXXXXXX')
  .get()
  .then(doc => {
    console.log('Status:', doc.data().status);
    console.log('Refund initiated:', doc.data().refundInitiated);
  })
```

---

## 📚 Additional Resources

- **Full Documentation**: `/docs/QA_FIXES_DOCUMENTATION.md`
- **API Documentation**: `/docs/API.md`
- **Admin Panel Guide**: `/docs/ADMIN_GUIDE.md`
- **Cashfree Integration**: `/docs/CASHFREE.md`

---

**Last Updated**: December 2025  
**Version**: 1.0
