# End-to-End Transaction Cycle Testing Guide 🧪

## Overview
This guide provides a comprehensive, step-by-step walkthrough to test the **complete transaction lifecycle** from job posting to payment release. This simulates real-world usage and verifies all critical integrations.

---

## 🎯 Test Objective
Verify the entire chain: **Post → Bid → Award → Pay → Complete → Release**

---

## 📋 Pre-Test Checklist

### Environment Setup
- [x] Development server running (`npm run dev`)
- [x] Database seeded with test accounts
- [x] All environment variables configured
- [x] Browser console open for monitoring errors

### Test Accounts Required
| Role | Email | Password | Purpose |
|:-----|:------|:---------|:--------|
| **Job Giver** | `jobgiver@example.com` | `Vikas@129229` | Posts job, awards, pays |
| **Installer** | `installer@example.com` | `Vikas@129229` | Bids, accepts, completes |
| **Admin** | `vikasakankshasharma@gmail.com` | `Vikas@129229` | Monitor transactions |

### Test Credentials
- **Aadhar Number**: `999999990019`
- **OTP Code**: `123456`
- **Test Card**: `4111 1111 1111 1111`
- **CVV**: `123`
- **Expiry**: Any future date (e.g., `12/25`)

---

## 🔄 Complete Test Cycle

### Phase 1: Job Posting (Job Giver)

#### Step 1.1: Login as Job Giver
1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Email: `jobgiver@example.com`
   - Password: `Vikas@129229`
3. Click "Sign In"
4. **Verify**: Redirected to dashboard

#### Step 1.2: Post a New Job
1. Navigate to "Post Job" from sidebar
2. Choose **Manual Posting** (skip AI wizard for faster testing)
3. Fill in job details:
   ```
   Job Title: Install 4 CCTV Cameras for Retail Shop
   Description: Need professional installation of 4 outdoor cameras with DVR setup
   Skills Required: CCTV Installation, Wiring, DVR Configuration
   Budget: ₹8,000
   Location: [Use manual address entry]
   Address: 123 MG Road, Bangalore, Karnataka, 560001
   Bidding Deadline: [Set to 2 days from now]
   Job Start Date: [Set to 5 days from now]
   ```
4. Click "Post Job"
5. **Verify**: 
   - Success message appears
   - Job appears in "My Posted Jobs"
   - Job status is `Open`

#### Step 1.3: Document Job ID
- Copy the Job ID from the job card (e.g., `job_abc123`)
- **Note this for tracking throughout the test**

---

### Phase 2: Bidding (Installer)

#### Step 2.1: Logout and Login as Installer
1. Click user menu → Logout
2. Login with installer credentials:
   - Email: `installer@example.com`
   - Password: `Vikas@129229`
3. **Verify**: Dashboard shows "Installer" role

#### Step 2.2: Verify KYC Status (If Needed)
1. Navigate to Profile
2. Check if "Verified" badge is present
3. If not verified:
   - Go to "Verify Account"
   - Enter Aadhar: `999999990019`
   - Enter OTP: `123456`
   - Submit verification
   - **Verify**: "Verified" badge appears

#### Step 2.3: Browse and Find the Job
1. Navigate to "Browse Jobs" from sidebar
2. Locate the job posted in Phase 1
3. Click on the job card to view details
4. **Verify**:
   - Job title matches
   - Budget is visible
   - "Place Bid" button is enabled

#### Step 2.4: Submit a Bid
1. Click "Place Bid"
2. Fill in bid details:
   ```
   Bid Amount: ₹7,500
   Cover Letter: I have 5+ years of experience in CCTV installation. 
                 I can complete this project within 2 days with high-quality 
                 equipment and professional wiring. I guarantee all work.
   ```
3. Click "Submit Bid"
4. **Verify**:
   - Success message appears
   - Bid appears in "My Bids" section
   - Bid status is `Pending`

---

### Phase 3: Award Job (Job Giver)

#### Step 3.1: Switch Back to Job Giver
1. Logout from installer account
2. Login as `jobgiver@example.com`
3. Navigate to "My Posted Jobs"

#### Step 3.2: Review Bids
1. Click on the job posted in Phase 1
2. Navigate to "Bids" tab
3. **Verify**:
   - Installer's bid is visible
   - Bid amount shows ₹7,500
   - Cover letter is displayed

#### Step 3.3: Award the Job
1. Click "Award Job" on the installer's bid
2. Select award strategy: **Simultaneous** (for faster testing)
3. Confirm the award
4. **Verify**:
   - Success message appears
   - Job status changes to `Pending Acceptance`
   - Installer receives notification

---

### Phase 4: Accept Job (Installer)

#### Step 4.1: Switch to Installer
1. Logout and login as `installer@example.com`
2. Navigate to "My Bids"
3. **Verify**: Job shows "Offer Received" status

#### Step 4.2: Check Payout Account
1. Before accepting, navigate to Profile
2. Check if bank details are configured
3. If not configured:
   - Go to "Payout Settings"
   - Add test bank details:
     ```
     Account Holder: Test Installer
     Account Number: 1234567890
     IFSC Code: SBIN0001234
     Bank Name: State Bank of India
     ```
   - Save details

#### Step 4.3: Accept the Offer
1. Go back to "My Bids"
2. Click on the job with offer
3. Click "Accept Offer"
4. **Verify**:
   - Success message appears
   - Job status changes to `Pending Funding`
   - 48-hour funding deadline is set

---

### Phase 5: Fund the Job (Job Giver)

#### Step 5.1: Switch to Job Giver
1. Logout and login as `jobgiver@example.com`
2. Navigate to "My Posted Jobs"
3. Click on the job
4. **Verify**: 
   - Status shows `Pending Funding`
   - "Fund Project" button is visible
   - Countdown timer shows funding deadline

#### Step 5.2: Initiate Payment
1. Click "Fund Project"
2. Review payment breakdown:
   - Installer Amount: ₹7,500
   - Platform Fee: [Check calculated fee]
   - Total: [Verify total]
3. Click "Proceed to Payment"

#### Step 5.3: Complete Payment via Cashfree
1. Cashfree payment page opens
2. Enter test card details:
   ```
   Card Number: 4111 1111 1111 1111
   CVV: 123
   Expiry: 12/25
   Cardholder Name: Test User
   ```
3. Enter OTP: `123456`
4. Click "Pay Now"
5. **Verify**:
   - Payment success message
   - Redirected back to job page
   - Job status changes to `In Progress`

#### Step 5.4: Verify Transaction Record
1. Navigate to Dashboard
2. Check recent transactions
3. **Verify**:
   - Payment transaction is recorded
   - Amount matches
   - Status is "Completed"

---

### Phase 6: Job Execution (Both Parties)

#### Step 6.1: Test Messaging (Optional)
1. As Job Giver, go to job details
2. Navigate to "Messages" tab
3. Send a message: "When can you start the work?"
4. Logout and login as Installer
5. Go to the job and reply: "I can start tomorrow morning"
6. **Verify**: Messages appear in chronological order

#### Step 6.2: Simulate Work Completion (Installer)
1. As Installer, navigate to the job
2. Click "Submit Work"
3. Upload proof of work:
   - Upload 2-3 test images (any images will work)
   - Add completion notes: "All 4 cameras installed and tested. DVR configured with remote access."
4. Click "Submit for Review"
5. **Verify**:
   - Success message appears
   - Job status changes to `Pending Confirmation`
   - Job Giver receives notification

---

### Phase 7: Approve & Release Payment (Job Giver)

#### Step 7.1: Review Submitted Work
1. Logout and login as `jobgiver@example.com`
2. Navigate to "My Posted Jobs"
3. Click on the job
4. **Verify**:
   - Status shows `Pending Confirmation`
   - "Review Work" button is visible

#### Step 7.2: Review Proof of Work
1. Click "Review Work"
2. View uploaded images
3. Read completion notes
4. **Verify**: All proof of work is displayed correctly

#### Step 7.3: Approve and Release Payment
1. Click "Approve & Release Payment"
2. Confirm the action
3. **Verify**:
   - Success message appears
   - Job status changes to `Completed`
   - Payment release is initiated

#### Step 7.4: Verify Payout Transaction
1. Navigate to Dashboard
2. Check recent transactions
3. **Verify**:
   - Payout transaction is recorded
   - Installer receives payment
   - Platform commission is deducted

---

### Phase 8: Post-Completion Activities

#### Step 8.1: Leave Rating & Review (Job Giver)
1. On the completed job page
2. Click "Leave Review"
3. Provide rating: **5 stars**
4. Write review: "Excellent work! Professional installation and great communication."
5. Submit review
6. **Verify**:
   - Review is saved
   - Installer's rating is updated

#### Step 8.2: Check Installer Profile Update
1. Logout and login as `installer@example.com`
2. Navigate to Profile
3. **Verify**:
   - Reputation points increased
   - New review appears
   - Rating is updated

#### Step 8.3: Verify Invoice Generation
1. As Job Giver, go to completed job
2. Click "Download Invoice"
3. **Verify**:
   - Invoice PDF is generated
   - Contains correct amounts
   - Shows installer and job giver details

---

### Phase 9: Admin Verification

#### Step 9.1: Login as Admin
1. Logout and login as `vikasakankshasharma@gmail.com`
2. Navigate to Admin Dashboard

#### Step 9.2: Verify All Transactions
1. Go to "Transactions" section
2. Filter by recent date
3. **Verify**:
   - Job funding transaction is present
   - Payout transaction is present
   - Commission transaction is present
   - All amounts are correct

#### Step 9.3: Check Job in All Jobs
1. Navigate to "All Jobs"
2. Search for the test job
3. **Verify**:
   - Job status is `Completed`
   - All details are accurate
   - Timeline shows all status changes

#### Step 9.4: Verify Reports
1. Navigate to "Reports"
2. Check KPI cards:
   - Total transactions increased
   - Revenue includes commission
   - Active jobs count is accurate
3. **Verify**: All metrics are updated correctly

---

## ✅ Success Criteria

### Critical Validations
- [ ] Job successfully posted with correct details
- [ ] Installer can view and bid on the job
- [ ] Job Giver can award the job
- [ ] Installer can accept the offer
- [ ] Payment gateway integration works (Cashfree)
- [ ] Funds are held in escrow (Pending Confirmation)
- [ ] Work submission uploads files correctly
- [ ] Payment release triggers payout
- [ ] Commission is calculated and recorded
- [ ] Invoice is generated correctly
- [ ] All status transitions are correct
- [ ] Notifications are sent at each stage
- [ ] Transaction records are complete and accurate

### Data Integrity Checks
- [ ] Job status updates correctly at each phase
- [ ] User balances/transactions are accurate
- [ ] Installer reputation points update
- [ ] All timestamps are recorded
- [ ] No duplicate transactions
- [ ] No orphaned records

### UI/UX Validations
- [ ] All buttons are enabled/disabled appropriately
- [ ] Loading states appear during async operations
- [ ] Success/error messages are clear
- [ ] Navigation flows logically
- [ ] No console errors
- [ ] Responsive design works on mobile

---

## 🐛 Common Issues & Troubleshooting

### Issue: Payment Gateway Not Loading
**Solution**: 
- Check `.env.local` for Cashfree credentials
- Verify Cashfree is in TEST mode
- Check browser console for errors

### Issue: Payout Account Prompt Not Appearing
**Solution**:
- Ensure installer profile has `verified: true`
- Check if bank details are already configured
- Verify the prompt logic in `job-detail-client.tsx`

### Issue: Job Status Not Updating
**Solution**:
- Check Firestore rules
- Verify Firebase Admin SDK is initialized
- Check server-side functions are deployed

### Issue: Images Not Uploading
**Solution**:
- Verify Firebase Storage rules
- Check storage bucket configuration
- Ensure file size is under limit

---

## 📊 Test Results Template

```markdown
## E2E Test Results - [Date]

### Test Environment
- Branch: [branch-name]
- Commit: [commit-hash]
- Tester: [Your Name]

### Phase Results
| Phase | Status | Notes |
|:------|:-------|:------|
| 1. Job Posting | ✅ PASS | |
| 2. Bidding | ✅ PASS | |
| 3. Award Job | ✅ PASS | |
| 4. Accept Job | ✅ PASS | |
| 5. Fund Job | ✅ PASS | |
| 6. Job Execution | ✅ PASS | |
| 7. Release Payment | ✅ PASS | |
| 8. Post-Completion | ✅ PASS | |
| 9. Admin Verification | ✅ PASS | |

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### Overall Result
- [ ] ✅ ALL TESTS PASSED
- [ ] ⚠️ PASSED WITH MINOR ISSUES
- [ ] ❌ FAILED - CRITICAL ISSUES

### Recommendations
- [Any suggestions for improvements]
```

---

## 🚀 Quick Test Script

For rapid testing, use this condensed checklist:

```
1. Login as Job Giver → Post Job → Note Job ID
2. Login as Installer → Find Job → Submit Bid
3. Login as Job Giver → Award Job
4. Login as Installer → Accept Offer
5. Login as Job Giver → Fund Project (Test Card)
6. Login as Installer → Submit Work (Upload Images)
7. Login as Job Giver → Approve & Release Payment
8. Login as Admin → Verify Transactions
```

**Expected Duration**: 15-20 minutes for complete cycle

---

## 📝 Notes

- Always test in a **clean database state** or use fresh test accounts
- Document any deviations from expected behavior
- Take screenshots of critical steps
- Monitor browser console for errors throughout
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices for responsive design

---

## 🔄 Automated Testing (Future)

Consider implementing:
- Playwright/Cypress for E2E automation
- API testing with Postman/Jest
- Load testing for concurrent users
- Integration tests for payment flows

---

**Last Updated**: 2025-12-17
**Version**: 1.0
