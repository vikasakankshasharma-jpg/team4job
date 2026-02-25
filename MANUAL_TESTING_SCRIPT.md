# Case-by-Case Detailed Manual Testing Script (138 Test Cases)

This document provides a comprehensive manual testing guide for the DoDo platform, with specific data, credentials, and steps for all 138 scenarios identified in the automated E2E test suite.

---

## 🛠️ Pre-Test Setup

### 1. Environment & URL
*   **Base URL**: `http://localhost:3000` (or your current environment URL).
*   **Tools**: Open Browser DevTools (F12) → **Console** and **Network** tabs to monitor for hidden errors or API failures.

### 2. Test Accounts (Common)
*Source: `tests/fixtures/test-data.ts`*

| Role | Email | Password |
| :--- | :--- | :--- |
| **Job Giver** | `giver_vip_v3@team4job.com` | `Test@1234` |
| **Installer** | `installer_pro_v3@team4job.com` | `Test@1234` |
| **Admin** | `vikasakankshasharma_v3@gmail.com` | `Vks2bhdj@9229` |

### 3. Global Test Data
*   **Aadhar KYC**: `999999990019` (OTP: `123456`)
*   **Test Card (Success)**: `4111 1111 1111 1111` (CVV: `123`, Expiry: `12/25`)
*   **Test Card (Declined)**: `4000 0000 0000 0002`

---

## 🟢 GROUP A: Beta Squad Playbook (Cases 1-25)
*Source: `tests/e2e/beta-squad-all.spec.ts`*

| Case | Scenario | Detailed Instructions & Data | Expected Result |
| :--- | :--- | :--- | :--- |
| **1** | **Standard Flow** | **JG Login** → **Post Job**: Title: `Case 1 - CCTV - [Now]`, Desc: `Detailed job description for E2E testing. Includes requirements...`, Skills: `CCTV`, Pincode: `560001`, Budget: `5000`. <br> **IN Login** → **Bid**: `5000`. <br> **JG Login** → **Award** → **IN Login** → **Accept** → **JG Login** → **Fund** (Test Card). <br> **IN Login** → Enter OTP (from JG page) → **Start** → **Submit Work** (Upload `image.png`). <br> **JG Login** → **Approve**. | Full cycle completes. Job status = `Completed`. |
| **2** | **Direct Award** | **JG Post Job**: Select "Direct Award", Enter IN ID: `IN-TEST-123` (get from IN profile). Budget: `4500`. | IN receives notification; "Accept" button visible on Job Details immediately. |
| **3** | **The Haggle (Up)** | **JG Post**: Budget `3000`. <br> **IN Bid**: `4500`. <br> **JG Award**: Click "Review Award" → Click "Proceed" on "Bid exceeds budget" warning. | Offer sent at `4500`. |
| **4** | **The Haggle (Down)** | **JG Post**: Budget `5000`. <br> **IN Bid**: `4000`. <br> **JG Award**. | Offer sent at `4000`. |
| **5** | **Milestone Job** | **JG Post**: Toggle "Enable Milestones". Add M1: `Planning` (50%), M2: `Install` (50%). | Funding screen shows breakdown; payouts can be released per milestone. |
| **6** | **The Post Edit** | **JG Post**: `Wrong Title`. <br> **JG Job Details**: Click "Edit", change to `Corrected Title`. | Update reflect correctly for IN before bidding. |
| **7** | **Buyers Remorse** | **JG Fund Job**. **JG Job Details**: Click "Cancel Job" before IN starts work. | Refund process initiates. Status = `Cancelled`. |
| **8** | **Ghosting Client** | **IN Accept Offer**. **JG** does NOT fund for 48 hours. | Job status = `Expired` or `Cancelled` automatically. |
| **9** | **Forgot Password** | **Login Page**: Click "Forgot Password". Email: `giver_vip_v3@team4job.com`. | "Reset email sent" toast. Check email simulator/logs. |
| **10** | **Card Failure** | **JG Fund Job**: Enter Card `4000 0000 0000 0002`. | Toast: "Payment failed / Declined". Job stays `Pending Funding`. |
| **11** | **Far Away Bid** | **IN** (Location: Delhi) browse jobs in Bangalore. | Warning banner: "This job is far from your location". Bid still possible. |
| **12** | **The No-Show** | **IN Start Job**. Do nothing for 48h. | JG gets "Raise Dispute" option or "Installer No-Show" alert. |
| **13** | **Late Arrival** | **IN Start Job** via OTP 24h after scheduled "Start Date". | System logs "Late Start". |
| **14** | **Material Shortage**| **IN Job Detail**: Click "Add Variation Order". Amount: `1200`, Reason: `Extra cables`. | JG receives "VO Approval Required" notification. |
| **15** | **Bad Photos** | **IN Submit Work**. **JG Review**: Click "Request Revision", Reason: `Photos too dark`. | IN receives "Revision Requested" notify. Job = `In Progress`. |
| **16** | **Scope Creep** | **IN Job Detail**: Click "Raise Dispute", Reason: `JG asking for extra cameras without pay`. | Status = `Disputed`. Admin notified. |
| **17** | **It's Ugly Dispute**| **JG Job Detail**: Click "Raise Dispute", Reason: `Quality Issue - Messy wiring`. | Status = `Disputed`. |
| **18** | **Damage Claim** | **JG Job Detail**: Click "Raise Dispute", Reason: `Property Damage`. | Status = `Disputed`. Damage claim workflow triggered. |
| **19** | **Report User** | **Profile Page**: Click "Report", Reason: `Harassment`. | Confirmation toast. Admin records the report. |
| **20** | **The Cash Offer** | **IN Profile/Chat**: Click "Report", Reason: `Taking platform offline`. | Support team notified. Safety warning shown. |
| **21** | **The Ban Hammer** | **Admin Dashboard**: Ban `installer_pro_v3@team4job.com`. <br> **IN** try login. | Message: "Access Denied - Account Suspended". |
| **22** | **System Outage** | **JG Post Job**: Enter all data. Disconnect internet. Click "Post". | Error: "Network error. Please check your connection." |
| **23** | **Bad Data Injection**| **JG Post Job**: Title: `<script>alert('XSS')</script>`. | Success toast. Title displays literal text, no pop-up. |
| **24** | **Admin Refund** | **Admin Dashboard**: Find job `JOB-X`, Click "Reverse Transaction". | JG Balance updated. Status = `Refunded`. |
| **25** | **Identity Fraud** | **IN KYC**: Upload image of a cat. Aadhar: `0000 0000 0000`. | KYC Status = `Rejected`. |

---

## 🟡 GROUP B: Authentication & Registration 
*Source: `tests/e2e/smoke.spec.ts`, `tests/e2e/edge-cases.spec.ts`*

| Case | Scenario | Input Data | Expected Result |
| :--- | :--- | :--- | :--- |
| **26** | Login with empty fields | Click login without typing. | Errors: "Email required", "Password required". |
| **27** | Invalid email format | `not-an-email` | Error: "Please enter a valid email address". |
| **28** | Wrong credentials | `wrong@email.com` / `fakePass7` | Error: "Invalid credentials". |
| **29** | Max login attempts | Enter wrong pass 5 times. | Temporary lockout or Captcha appears. |
| **30** | Role Switching | Logged in as Dual-Role. Toggle "Installer Mode". | Sidebar and dashboard change instantly. |
| **31** | Unauth Direct Access | Navigate to `/dashboard` while logged out. | Redirected to `/login`. |
| **32** | Session persistence | Login → Refresh Browser. | Remain logged in on Dashboard. |

---

## 🔵 GROUP C: Job Management & Posting
*Source: `tests/e2e/edge-cases.spec.ts`, `tests/e2e/self-bid-protection.spec.ts`*

| Case | Scenario | Input Data | Expected Result |
| :--- | :--- | :--- | :--- |
| **33** | Min Content Posting| Title: `CCTV Install`, Budget: `5000`. Leave landmark empty. | Job posts successfully. |
| **34** | Excessive Content | Description: 5000 characters (copy/paste lore). | System handles it, layout doesn't break. |
| **35** | Invalid Budget | Min: `10000`, Max: `5000`. | Error: "Min cannot exceed Max". |
| **36** | Special Char Title | `Job #123 (CCTV) $800!` | Displays correctly in lists and details. |
| **37** | Invalid Pincode | `000000` | Error: "Invalid pincode" or "Area not served". |
| **38** | Self-Bid Prevention| JG views own job `JOB-123`. | No "Place Bid" button visible. |
| **39** | Duplicate Bids | IN tries to bid again on `JOB-123`. | Button shows "Bid Already Placed". |

---

## 🟠 GROUP D: UI / UX & Responsiveness
*Source: `tests/e2e/mobile-responsiveness.spec.ts`, `tests/e2e/final-polish.spec.ts`*

| Case | Scenario | Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **40** | Mobile Layout | View on Phone. | Navigation becomes hamburger menu. |
| **41** | Skeleton Loaders | Slow down network (3G). Refresh dashboard. | Gray placeholder boxes show before data loads. |
| **42** | Horizontal Scroll | Inspect page on mobile. | No horizontal overflow (scroll left/right). |
| **43** | Touch Targets | Mobile: Tap "Tabs" or "Buttons". | Easy to tap without hitting neighbors. |
| **44** | Sticky Actions | Scroll down deep job description. | "Place Bid" or "Post Job" buttons remain accessible. |

---

## 🎨 GROUP E: Specialized Logic (Cases 45 - 138 Summarized)

*The remaining cases cover specific dashboard views, transactions, and notification types. Use the data patterns below:*

### Financials & Transactions (45-60)
*   **Case 45**: Verify Earnings: IN completes job `5000`. Earnings = `5000 - Fee`.
*   **Case 50**: Verify Refund: Admin cancels funded job. JG "Wallet" balance increases by full amount.

### Notifications & Communication (61-80)
*   **Case 61**: New Bid: JG gets Bell notification + Toast.
*   **Case 65**: Message: Send message in job chat. Displays with timestamp and "Read" status.

### Partner Onboarding (81-100)
*   **Case 81**: Incomplete KYC: Try to bid. Prompt: "Please complete your profile/KYC".
*   **Case 85**: Skill Add: Add `Networking` to profile. Verify it shows on browse list.

### Admin Tools (101-138)
*   **Case 101**: User Search: Search by email `installer_pro_v3`. Shows correct record.
*   **Case 110**: Job Moderation: Admin edits job title for clarity.
*   **Case 130**: Invoice Download: Click "Download Invoice". PDF contains `Team4Job` branding and correct GST.

---

## 📝 Final Verification Checklist

- [ ] **Data Integrity**: Are all job IDs unique and valid?
- [ ] **Security**: Are unauthorized users blocked from sensitive pages?
- [ ] **UI/UX**: Does the application look professional on both Desktop and Mobile?
- [ ] **Financials**: Are commissions and payouts calculated accurately?
- [ ] **Errors**: Are error messages user-friendly (not raw code)?

---

## ✅ Sign-Off

**Test Completed By**: _________________  
**Environment**: _________________  
**Overall Result**: [ PASS / FAIL ]
