import sys

content = """# E2E & Smoke Tests Execution Plan

*Note: All tests have been unchecked because recent phase 6-10 upgrades (Role authorizations, PWA offline, password resets, cashfree webhooks) touch root layers of the application. A full regression pass is required.*

## Core E2E Flows (High Priority / Complex)
- [ ] [tests/e2e/complete-transaction-cycle.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/complete-transaction-cycle.spec.ts)
- [ ] [tests/e2e/desktop_user_flow.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/desktop_user_flow.spec.ts)
- [ ] [tests/e2e/mobile_user_flow.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/mobile_user_flow.spec.ts)
- [ ] [tests/e2e/beta-squad-all.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/beta-squad-all.spec.ts)
- [ ] [tests/e2e/beta-squad-case-1.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/beta-squad-case-1.spec.ts)
- [ ] [tests/e2e/variation-orders.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/variation-orders.spec.ts)

## Feature-Specific E2E
- [ ] [tests/e2e/milestones.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/milestones.spec.ts)
- [ ] [tests/e2e/invoice.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/invoice.spec.ts)
- [ ] [tests/e2e/budget-estimator.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/budget-estimator.spec.ts)
- [ ] [tests/e2e/reviews.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/reviews.spec.ts)
- [ ] [tests/e2e/partner-onboarding.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/partner-onboarding.spec.ts)
- [ ] [tests/e2e/role-switching.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/role-switching.spec.ts)
- [ ] [tests/e2e/analytics-dashboard.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/analytics-dashboard.spec.ts)
- [ ] [tests/e2e/dashboard-financials.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/dashboard-financials.spec.ts)
- [ ] [tests/e2e/notifications-system.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/notifications-system.spec.ts)
- [ ] [tests/e2e/self-bid-protection.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/self-bid-protection.spec.ts)
- [ ] [tests/e2e/role-redirects.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/role-redirects.spec.ts)

## Edge Cases
- [ ] [tests/e2e/edge-cases.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/edge-cases.spec.ts)

## UI & Smoke Verification
- [ ] [tests/e2e/smoke.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/smoke.spec.ts)
- [ ] [tests/e2e/admin-smoke.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/admin-smoke.spec.ts)
- [ ] [tests/e2e/mobile-responsiveness.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/mobile-responsiveness.spec.ts)
- [ ] [tests/e2e/ux-enhancements.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/ux-enhancements.spec.ts)
- [ ] [tests/e2e/final-polish.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/final-polish.spec.ts)
- [ ] [tests/e2e/verify-new-features.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/verify-new-features.spec.ts)

## Performance Testing
- [ ] [tests/e2e/performance.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/e2e/performance.spec.ts)
- [ ] [tests/performance/all-pages-performance.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/performance/all-pages-performance.spec.ts)
- [ ] [tests/performance/page-load.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/performance/page-load.spec.ts)
- [ ] [tests/perf/web-vitals.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/perf/web-vitals.spec.ts)

## Visual Regression
- [ ] [tests/visual/visual-regression.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/visual/visual-regression.spec.ts)

## Accessibility
- [ ] [tests/accessibility/a11y.spec.ts](file:///c:/Users/hp/Documents/DoDo/tests/accessibility/a11y.spec.ts)
"""

with open(r'c:\Users\hp\.gemini\antigravity\brain\7c5ebad1-7d70-407d-8de5-39c1161f6cca\task.md.resolved', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done writing strictly existing tests.')
