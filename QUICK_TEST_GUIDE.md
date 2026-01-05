# 🚀 Quick E2E Test Reference Card

## Test Accounts
| Role | Email | Password |
|:-----|:------|:---------|
| Job Giver | `jobgiver@example.com` | `Vikas@129229` |
| Installer | `installer@example.com` | `Vikas@129229` |
| Admin | `vikasakankshasharma@gmail.com` | `Vikas@129229` |

## Test Credentials
- **Aadhar**: `999999990019`
- **OTP**: `123456`
- **Card**: `4111 1111 1111 1111`
- **CVV**: `123`
- **Expiry**: `12/25`

## Quick Test Flow (15-20 mins)

### 1️⃣ POST JOB (Job Giver)
```
Login → Post Job → Fill Form → Submit
Job Title: Install 4 CCTV Cameras for Retail Shop
Budget: ₹8,000 - ₹12,000
Location: 560001, 123 MG Road, Bangalore
Deadline: +2 days | Start Date: +5 days
```
**✓ Verify**: Job appears in "My Posted Jobs"

### 2️⃣ BID (Installer)
```
Logout → Login as Installer → Browse Jobs → Find Job → Place Bid
Bid Amount: ₹7,500
Cover Letter: [Professional experience statement]
```
**✓ Verify**: Bid appears in "My Bids"

### 3️⃣ AWARD (Job Giver)
```
Logout → Login as Job Giver → My Posted Jobs → View Job → Bids Tab → Award Job
Strategy: Simultaneous
```
**✓ Verify**: Status = "Pending Acceptance"

### 4️⃣ ACCEPT (Installer)
```
Logout → Login as Installer → My Bids → Accept Offer
Check: Payout account configured
```
**✓ Verify**: Status = "Pending Funding"

### 5️⃣ FUND (Job Giver)
```
Logout → Login as Job Giver → My Posted Jobs → Fund Project
Payment: Test Card (4111 1111 1111 1111)
OTP: 123456
```
**✓ Verify**: Status = "In Progress"

### 6️⃣ COMPLETE (Installer)
```
Logout → Login as Installer → Job → Submit Work
Upload: 2-3 images
Notes: Installation complete
```
**✓ Verify**: Status = "Pending Confirmation"

### 7️⃣ RELEASE (Job Giver)
```
Logout → Login as Job Giver → Job → Review Work → Approve & Release Payment
```
**✓ Verify**: Status = "Completed"

### 8️⃣ REVIEW (Job Giver)
```
Leave Review: 5 stars + comment
Download Invoice
```
**✓ Verify**: Review saved, Invoice generated

### 9️⃣ ADMIN CHECK (Admin)
```
Logout → Login as Admin → Transactions → All Jobs → Reports
```
**✓ Verify**: All transactions recorded, KPIs updated

## Status Flow
```
Open for Bidding 
    ↓
Pending Acceptance 
    ↓
Pending Funding 
    ↓
In Progress 
    ↓
Pending Confirmation 
    ↓
Completed
```

## Critical Checkpoints
- [ ] Job ID generated correctly
- [ ] Bid amount matches (₹7,500)
- [ ] Payment gateway works
- [ ] Funds held in escrow
- [ ] Images upload successfully
- [ ] Payment released to installer
- [ ] Commission calculated
- [ ] Invoice generated
- [ ] All transactions recorded

## URLs
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard
- **Post Job**: http://localhost:3000/dashboard/post-job
- **Browse Jobs**: http://localhost:3000/dashboard/jobs
- **My Bids**: http://localhost:3000/dashboard/my-bids
- **Posted Jobs**: http://localhost:3000/dashboard/posted-jobs
- **Transactions**: http://localhost:3000/dashboard/transactions

## Common Issues
1. **Form not submitting**: Check all required fields filled
2. **Payment fails**: Verify test card details
3. **Images not uploading**: Check file size < 5MB
4. **Status not updating**: Refresh page

## Success Criteria
✅ All 9 phases complete without errors  
✅ All status transitions correct  
✅ All transactions recorded  
✅ No console errors  
✅ Invoice generated  

---
**Total Time**: ~15-20 minutes  
**Last Updated**: 2025-12-17
