# Advanced Test Scenarios - Error Cases & Edge Cases

## Overview
This document covers advanced testing scenarios including error handling, edge cases, boundary conditions, and failure recovery. These tests ensure the platform handles unexpected situations gracefully.

---

## 🔴 Error Case Testing

### EC-1: Authentication & Authorization Errors

#### EC-1.1: Expired Session During Job Posting
**Steps**:
1. Login as Job Giver
2. Fill out job posting form (don't submit yet)
3. Open browser DevTools → Application → Clear all cookies
4. Click "Post Job"

**Expected Result**:
- ❌ Error message: "You must be logged in to post a job"
- ✅ User redirected to login page
- ✅ No partial data saved to database

#### EC-1.2: Role Mismatch - Installer Trying to Post Job
**Steps**:
1. Login as Installer
2. Manually navigate to `/dashboard/post-job`

**Expected Result**:
- ✅ Redirected to dashboard
- ✅ Access denied message (or automatic redirect)

#### EC-1.3: Unverified Installer Attempting to Bid
**Steps**:
1. Create new installer account (don't complete KYC)
2. Try to place a bid on a job

**Expected Result**:
- ❌ Bid button disabled or shows verification prompt
- ✅ Message: "Please complete KYC verification to bid"

---

### EC-2: Payment Gateway Errors

#### EC-2.1: Payment Declined
**Steps**:
1. Complete flow up to payment
2. Use test card: `4000 0000 0000 0002` (Declined card)
3. Attempt payment

**Expected Result**:
- ❌ Payment fails with clear error message
- ✅ Job status remains "Pending Funding"
- ✅ User can retry payment
- ✅ No duplicate transactions created

#### EC-2.2: Payment Timeout
**Steps**:
1. Initiate payment
2. Leave payment page open without completing
3. Wait for timeout

**Expected Result**:
- ✅ Payment session expires
- ✅ User returned to job page
- ✅ Can retry payment

#### EC-2.3: Network Failure During Payment
**Steps**:
1. Start payment process
2. Disable network mid-transaction
3. Re-enable network

**Expected Result**:
- ✅ Graceful error handling
- ✅ Transaction status can be verified
- ✅ No duplicate charges

---

### EC-3: File Upload Errors

#### EC-3.1: Oversized File Upload
**Steps**:
1. Try to upload file > 10MB during job posting

**Expected Result**:
- ❌ Error: "File size exceeds maximum limit"
- ✅ File not uploaded
- ✅ Form can still be submitted without attachment

#### EC-3.2: Invalid File Type
**Steps**:
1. Try to upload .exe or .bat file

**Expected Result**:
- ❌ Error: "File type not supported"
- ✅ Only allowed file types accepted

#### EC-3.3: Upload Failure (Network Issue)
**Steps**:
1. Start uploading large file
2. Disconnect network mid-upload
3. Reconnect

**Expected Result**:
- ✅ Upload fails gracefully
- ✅ User notified of failure
- ✅ Can retry upload

---

### EC-4: Database Errors

#### EC-4.1: Firestore Write Failure
**Steps**:
1. Simulate Firestore being down (modify Firestore rules temporarily)
2. Try to post a job

**Expected Result**:
- ❌ Clear error message shown
- ✅ No partial data saved
- ✅ User can retry

#### EC-4.2: Concurrent Updates Conflict
**Steps**:
1. Job Giver awards job to Installer A
2. Simultaneously, Installer A accepts another job
3. Check if acceptance deadline conflict is handled

**Expected Result**:
- ✅ Proper conflict resolution
- ✅ Clear error message if conflict occurs

---

## 🟡 Edge Case Testing

### ED-1: Boundary Value Testing

#### ED-1.1: Minimum Budget (₹0)
**Steps**:
1. Post job with budget: Min = 0, Max = 0

**Expected Result**:
- ❌ Validation error: "Budget must be greater than 0"

#### ED-1.2: Maximum Budget (Very Large Number)
**Steps**:
1. Post job with budget: Min = 999999999

**Expected Result**:
- ✅ Accepted if within reasonable business limits
- ❌ Or validation error if exceeds platform limit

#### ED-1.3: Job Title Length Limits
**Steps**:
1. Try job title with exactly 9 characters
2. Try job title with exactly 10 characters
3. Try job title with 500 characters

**Expected Result**:
- ❌ 9 chars: "Job title must be at least 10 characters"
- ✅ 10 chars: Accepted
- ✅/❌ 500 chars: Check if there's a max limit

#### ED-1.4: Deadline = Today
**Steps**:
1. Set bidding deadline to today's date

**Expected Result**:
- ✅ Accepted (deadline >= today)
- ✅ Installers can bid immediately

#### ED-1.5: Job Start Date = Deadline Date
**Steps**:
1. Set job start date same as bidding deadline

**Expected Result**:
- ✅ Accepted (validation allows >=)
- ✅ Job can proceed normally

---

### ED-2: Timing & Deadline Edge Cases

#### ED-2.1: Accept Offer at Last Second (Before Deadline)
**Steps**:
1. Award job to installer
2. Wait until 1 minute before 48-hour deadline
3. Installer accepts

**Expected Result**:
- ✅ Acceptance successful
- ✅ Status changes to "Pending Funding"

#### ED-2.2: Accept Offer After Deadline
**Steps**:
1. Award job to installer
2. Wait for 48-hour deadline to pass
3. Try to accept

**Expected Result**:
- ❌ Acceptance button disabled or error shown
- ✅ Offer marked as expired
- ✅ Installer penalized (reputation points deducted)

#### ED-2.3: Fund Job at Last Second (Before Funding Deadline)
**Steps**:
1. Installer accepts offer
2. Wait until 1 minute before 48-hour funding deadline
3. Job Giver funds project

**Expected Result**:
- ✅ Payment successful
- ✅ Status changes to "In Progress"

#### ED-2.4: Funding Deadline Expires
**Steps**:
1. Installer accepts offer
2. Wait for 48-hour funding deadline to pass
3. Check job status

**Expected Result**:
- ✅ Job automatically cancelled by scheduled function
- ✅ Both parties notified
- ✅ Installer can bid again if job is re-posted

---

### ED-3: Multiple User Interactions

#### ED-3.1: Multiple Installers Bid Simultaneously
**Steps**:
1. Have 3 installers bid on same job at exact same time

**Expected Result**:
- ✅ All bids recorded correctly
- ✅ No data loss or corruption
- ✅ Bid count accurate

#### ED-3.2: Simultaneous Award - First to Accept Wins
**Steps**:
1. Award job to 3 installers simultaneously
2. Have 2 installers try to accept at same time

**Expected Result**:
- ✅ First acceptance wins
- ✅ Other offers automatically cancelled
- ✅ Other installers notified

#### ED-3.3: Job Giver Edits Job While Installer is Bidding
**Steps**:
1. Installer starts filling bid form
2. Job Giver edits job (clears all bids)
3. Installer submits bid

**Expected Result**:
- ❌ Bid submission fails with error
- ✅ Installer notified job was updated
- ✅ Installer can view updated job and bid again

---

### ED-4: Data Integrity Edge Cases

#### ED-4.1: Empty Skills Array
**Steps**:
1. Post job with skills field: just spaces or commas

**Expected Result**:
- ❌ Validation error: "Please provide at least one skill"

#### ED-4.2: Special Characters in Input
**Steps**:
1. Job title: `Install <script>alert('XSS')</script> Cameras`
2. Description with SQL injection attempt

**Expected Result**:
- ✅ Special characters escaped/sanitized
- ✅ No script execution
- ✅ Data stored safely

#### ED-4.3: Unicode and Emoji in Text Fields
**Steps**:
1. Job title: `Install 📹 CCTV Cameras 🏢`
2. Description with Hindi/Chinese characters

**Expected Result**:
- ✅ Unicode characters accepted
- ✅ Display correctly throughout app
- ✅ Search/filter works correctly

---

### ED-5: Location & Address Edge Cases

#### ED-5.1: Invalid Pincode
**Steps**:
1. Enter pincode: `000000` or `ABCDEF`

**Expected Result**:
- ❌ Validation error or no results found
- ✅ User prompted to enter valid pincode

#### ED-5.2: Blacklisted Pincode
**Steps**:
1. Admin adds pincode to blacklist
2. Try to post job with that pincode

**Expected Result**:
- ❌ Error: "Jobs cannot be posted in this area"
- ✅ Clear message to user

#### ED-5.3: Address with Very Long Text
**Steps**:
1. Enter 500-character address in street field

**Expected Result**:
- ✅ Accepted if within field limit
- ❌ Or truncated/validated appropriately

---

### ED-6: Workflow State Edge Cases

#### ED-6.1: Job Giver Cancels After Installer Submits Work
**Steps**:
1. Installer submits work (status: Pending Confirmation)
2. Job Giver initiates cancellation

**Expected Result**:
- ❌ Cancellation not allowed at this stage
- ✅ Error: "Cannot cancel after work submission"
- ✅ Must either approve or raise dispute

#### ED-6.2: Installer Tries to Submit Work Before Funding
**Steps**:
1. Job status is "Pending Funding"
2. Installer tries to access "Submit Work"

**Expected Result**:
- ❌ Submit work button disabled
- ✅ Message: "Wait for job to be funded"

#### ED-6.3: Multiple Work Submissions
**Steps**:
1. Installer submits work
2. Try to submit again

**Expected Result**:
- ❌ Second submission blocked
- ✅ Message: "Work already submitted"

---

### ED-7: Review & Rating Edge Cases

#### ED-7.1: Review Without Rating
**Steps**:
1. Try to submit review text without selecting stars

**Expected Result**:
- ❌ Validation error: "Please select a rating"

#### ED-7.2: Rating Without Review Text
**Steps**:
1. Select 5 stars but leave review text empty

**Expected Result**:
- ✅ Accepted (review text optional)
- ✅ Rating recorded

#### ED-7.3: Extremely Long Review (1000+ characters)
**Steps**:
1. Write very long review

**Expected Result**:
- ✅ Accepted if within limit
- ❌ Or truncated with character count warning

---

### ED-8: Direct Award Edge Cases

#### ED-8.1: Direct Award to Non-Existent Installer ID
**Steps**:
1. Enter invalid installer ID: `INVALID123`
2. Try to post job

**Expected Result**:
- ❌ Validation error: "Installer not found"
- ✅ Cannot submit form

#### ED-8.2: Direct Award to Unverified Installer
**Steps**:
1. Enter ID of unverified installer

**Expected Result**:
- ❌ Error: "Installer must be verified"
- ✅ Cannot proceed

#### ED-8.3: Direct Award to Blocked Installer
**Steps**:
1. Job Giver has blocked Installer A
2. Try to direct award to Installer A

**Expected Result**:
- ❌ Error: "Cannot award to blocked installer"
- ✅ Or warning shown

#### ED-8.4: Self-Award Attempt
**Steps**:
1. User has both Job Giver and Installer roles
2. Try to direct award to own installer ID

**Expected Result**:
- ❌ Error: "Cannot award job to yourself"
- ✅ Anti-self-bidding protection works

---

## 🟢 Recovery & Resilience Testing

### RC-1: Session Recovery

#### RC-1.1: Browser Crash During Job Posting
**Steps**:
1. Fill job form halfway
2. Force close browser
3. Reopen and login

**Expected Result**:
- ⚠️ Form data lost (expected)
- ✅ No corrupt data in database
- ✅ User can start fresh

#### RC-1.2: Network Interruption During Bid Submission
**Steps**:
1. Fill bid form
2. Disable network
3. Click submit
4. Re-enable network

**Expected Result**:
- ❌ Error: "Network error, please try again"
- ✅ Bid not submitted
- ✅ Can retry

---

### RC-2: Data Consistency

#### RC-2.1: Orphaned Transactions
**Steps**:
1. Check for any transactions without corresponding jobs
2. Check for jobs without transaction records

**Expected Result**:
- ✅ All transactions have valid job references
- ✅ All completed jobs have transaction records

#### RC-2.2: Mismatched Status
**Steps**:
1. Check if job status matches transaction status
2. Verify installer reputation matches completed jobs

**Expected Result**:
- ✅ All statuses consistent
- ✅ No data mismatches

---

## 📊 Test Execution Template

### Test Case: [EC/ED/RC-X.X]
**Scenario**: [Description]  
**Tester**: [Name]  
**Date**: [Date]  
**Environment**: [Local/Staging/Production]

**Pre-conditions**:
- [ ] Condition 1
- [ ] Condition 2

**Test Steps**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
- ✅ Expected outcome 1
- ✅ Expected outcome 2

**Actual Result**:
- [ ] ✅ PASS
- [ ] ❌ FAIL

**Notes**:
```
[Any observations, screenshots, or additional details]
```

**Issues Found**:
```
[Link to bug report or issue tracker]
```

---

## 🎯 Priority Matrix

| Priority | Test Cases | Rationale |
|:---------|:-----------|:----------|
| **P0 - Critical** | EC-2.x (Payment), EC-4.x (Database), ED-6.x (Workflow) | Core business logic, financial transactions |
| **P1 - High** | EC-1.x (Auth), ED-2.x (Deadlines), ED-3.x (Concurrent) | User experience, data integrity |
| **P2 - Medium** | EC-3.x (File Upload), ED-4.x (Data), ED-7.x (Reviews) | Important but not blocking |
| **P3 - Low** | ED-1.x (Boundaries), ED-5.x (Location) | Edge cases, rare scenarios |

---

## 🔄 Regression Testing Checklist

After fixing any bugs, re-run these critical scenarios:

- [ ] EC-2.1: Payment declined handling
- [ ] EC-4.2: Concurrent updates
- [ ] ED-2.2: Accept after deadline
- [ ] ED-2.4: Funding deadline expiry
- [ ] ED-3.2: Simultaneous award acceptance
- [ ] ED-6.1: Invalid state transitions
- [ ] ED-8.4: Self-award prevention

---

## 📝 Notes

- Run these tests in a **test environment** with test data
- Document all failures with screenshots and logs
- Some tests require admin access to modify settings
- Network simulation may require browser DevTools
- Time-based tests may need system clock manipulation

---

**Created**: 2025-12-17  
**Version**: 1.0  
**Last Updated**: 2025-12-17
