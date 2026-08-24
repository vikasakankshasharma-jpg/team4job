# Dealer Workspace Audit & Architecture

## 1. Executive Summary & Vision

The **Dealer Workspace** is not just a dashboard; it is designed as a **B2B Operating System** that encompasses the entire lifecycle of a dealer's recurring operations. 

```text
                 DEALER
                    │
          ┌─────────▼─────────┐
          │ Dealer Workspace  │
          └─────────┬─────────┘
                    │
          Customer / Service Site
                    │
                    ▼
                  JOB
              ┌─────┴─────┐
              │           │
         Job State    Payment State
              │           │
              ▼           ▼
          Matching      Financial
              │           │
              └─────┬─────┘
                    ▼
                Installer
                    │
                    ▼
                Execution
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   Global Reputation    Dealer Memory
          │                   │
          └─────────┬─────────┘
                    ▼
              Next Job / AI
```

A critical architectural principle is the **isolation of private intelligence vs. global reputation**. A dealer's private relationship, pricing, margins, and specific operational memory with an installer remain strictly confidential and do not directly leak into the global reputation system, though they may heavily weight the local recommendation algorithm for that specific dealer.

---

## 2. Core Modules

### 2.1 Dealer Dashboard (Command Center)
- **Active Jobs:** Real-time view of jobs currently in progress or awaiting installer arrival.
- **Pending Bids/Matches:** Jobs awaiting dealer review of suggested installers or active bids.
- **Action Required:** Centralized alert system for disputes, stalled jobs, or missing documentation.
- **Completed / Disputed Jobs:** Historical log with quick filtering for resolution tracking.

### 2.2 Customer/Site Memory (The Differentiator)
The most valuable part of the dashboard is the Service Relationship Memory. When opening a customer/site:
```text
Sharma Electronics — Jaipur

Previous Jobs: 8
Last Service: 42 days ago
Preferred Installer: Raj CCTV Services
Average Rating: 4.8
Last Issue: DVR replacement
Next Recommended Action: AMC inspection
```
Future AI will utilize this memory to suggest actions (e.g., "In the last 3 visits, there was a DVR issue. Recommend including a DVR health check").

### 2.3 Job Creation Engine & B2B Customer Identity
- **Dealer Customer ≠ Platform User:** A dealer's customer is not necessarily a platform user. `endCustomerId` must remain optional, and `endCustomerContact` is managed separately. Existing service history can be safely linked if they register later.
- **Service Location Intelligence:** Rich location data tied to historical service records.
- **Job Value & Financials:** Isolated fields for margin, cost, and B2B pricing.
- **Required Skills & Scope:** Categorized tags to feed the Smart Matching engine.
- **Evidence & Attachments:** Pre-job photos, site requirements, and instructional documents.

### 2.4 Smart Matching Panel
- **Recommended Installers:** Ranked list based on the global + local AI algorithm.
- **Score Breakdown:** Transparent view of *why* an installer was recommended.
- **Reputation / Quality Confidence:** Aggregated global score + historical success rate.
- **Explainability:** Human-readable explanations (e.g., "Recommended because: Worked at this site 2 months ago").

### 2.5 Private Feedback vs Global Reputation
- **Global:** E.g., “Installer quality: 5★” — feeds into the global reputation system representing Trust.
- **Private Dealer Feedback:** E.g., “Always arrives 15 min early, excellent with commercial sites.” — feeds only into the Dealer's operational memory.

### 2.6 Installer Selection & Awarding
- **Human-in-the-Loop:** Dealers can accept or reject AI recommendations.
- **No AI Auto-Award:** AI is advisory only; it does not have the authority to auto-award jobs.
- **Manual Search & Override:** Dealers can bypass recommendations.

### 2.7 B2B Repeat Workflow
- **"Post Similar Job":** 1-click duplication of previous job parameters.
- **Existing Site / Customer:** Rapid spin-up of new jobs at known locations.
- **Data Prefill:** Utilizing the Operational Memory to auto-fill logistics, contacts, and requirements.

---

## 3. Workflow & State Architecture

Job lifecycle and financial lifecycle are completely decoupled to integrate cleanly with the payment engine (e.g., Job = `COMPLETED`, Payment = `PAYMENT_PENDING` is perfectly valid).

### 3.1 Job State Machine
`DRAFT → MATCHING_PENDING → REVIEWING_RECOMMENDATIONS → AWARDED → IN_PROGRESS → COMPLETED → CLOSED`

### 3.2 Financial Lifecycle
`NOT_APPLICABLE → PAYMENT_PENDING → ESCROW_FUNDED → RELEASE_PENDING → RELEASED → REFUND_PENDING → REFUNDED / DISPUTED`

---

## 4. Security Matrix & Privacy Architecture

### 4.1 Exact Address Bypass Protection (Mandatory Rule)
**Before Award (Matching Stage):** Installers can only see approximate location/pincode, required skills, estimated scope, and timing.
**After Award:** Exact address, customer name, phone, and private dealer information are unlocked. This is a mandatory security rule to protect privacy and prevent off-platform bypass.

### 4.2 Data Isolation Principles
| Data Type | Visibility | AI Usage |
| :--- | :--- | :--- |
| **Global Reputation Score** | Public (Dealers & Installers) | Base matching algorithm |
| **Dealer-Specific Feedback** | Private (Dealer only) | Dealer's localized matching algorithm only |
| **Job Margins & B2B Pricing**| Private (Dealer only) | Excluded from all algorithms |
| **Site History (Same Site)** | Private (Dealer only) | Heavily weights localized matching |
| **Exact Address/Customer Info**| Installer (Post-Award only) | Logistics calculation only |

---

## 5. Key Metrics & Telemetry

1. **Jobs per Active Dealer / Month:** Core adoption and throughput.
2. **Revenue / Active Dealer / Month & GMV / Active Dealer / Month:** Tracks the business health and difference between low-volume/high-value and high-volume/low-value operations.
3. **Repeat Customer / Site Rate:** Indicates stickiness and successful B2B recurring workflows.
4. **Match → Award Conversion:** Measures the accuracy of Smart Matching.
5. **Installer Repeat Rate (per Dealer):** Measures the strength of the private intelligence recommendation.

---

## 6. Implementation Sequence

**Phase 1 — Backend domain model**
Dealer / Customer / Site / Job relationships

**Phase 2 — State machine + Payment state**
Invalid transition prevention

**Phase 3 — Security Rules**
Dealer isolation + pre-award privacy

**Phase 4 — Dealer operational memory**
Customer/site/repeat-job workflow

**Phase 5 — Smart Matching integration**
Consuming the existing calibrated engine (No duplication)

**Phase 6 — Dealer Workspace UI**

**Phase 7 — Adversarial + Integration tests**
