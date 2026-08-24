# Product Engineering Weekly Review
**Frequency:** Weekly (e.g., Every Monday at 10 AM)
**Objective:** Align engineering execution with core business metrics (Conversion, Quality, Speed, Stability) to ensure Team4Job remains the category-defining marketplace.

---

## 1. Funnel Metrics (Analytics)
*Goal: Are users successfully getting through our core flows?*

- [ ] **Landing Page Conversion:** Calculate CTA CTR vs Bounce Rate.
- [ ] **Signup Drop-off:** Review total `signup_started` vs `signup_completed`. At which step are users abandoning the flow?
- [ ] **Job Post Success Rate:** Review `job_posted` events against initiated job drafts.
- [ ] **Time-to-First-Bid:** Average wait time for a new `Job Giver` to receive their first installer bid.

## 2. Platform Quality & Trust
*Goal: Are users actually safe and satisfied?*

- [ ] **Dispute Rate:** Number of jobs entering disputes / Total jobs completed. 
- [ ] **KYC Friction:** Review manual Aadhar/PAN verification queue and rejection rate.
- [ ] **Escrow Health:** Total funds currently locked vs released (Is money moving efficiently?).

## 3. Engineering & Performance (Web Vitals)
*Goal: Is the site fast, error-free, and accessible?*

- [ ] **Core Web Vitals:** Check Vercel/Lighthouse CI metrics for LCP (< 2.5s) and CLS (< 0.1).
- [ ] **Sentry Error Spikes:** Review top 5 most frequent unhandled exceptions generated in Production. Create P1/P2 tickets to resolve.
- [ ] **Test Health:** Review Playwright E2E pass rate. Are there any flaky tests blocking CI deployments?

## 4. Prioritization
*Action: Allocate engineering bandwidth for the upcoming sprint.*

- [ ] **P0 (Hotfixes):** Any security vulnerabilities or payment flow crashes?
- [ ] **P1 (Growth Debt):** What UX friction is hurting conversion the most?
- [ ] **P2 (Feature Requests):** What explicit features are `Job Givers` or `Installers` requesting?

---
*Generated as part of the Phase C: Production Readiness rollout.*
