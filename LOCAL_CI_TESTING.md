# Local CI Testing Guide

> **One script, same environment, same results as GitHub Actions.**

## Quick Start

```powershell
# Full CI pipeline (lint → build → all tests)
.\run-ci-local.ps1

# Just smoke tests (~15 min)
.\run-ci-local.ps1 -Suite smoke-auth

# Just one E2E group (~5-10 min)
.\run-ci-local.ps1 -Suite e2e -Group 7

# Debug a specific failing test with visible browser
.\run-ci-local.ps1 -TestFile "tests/e2e/complete-transaction-cycle.spec.ts" -Headed
```

## Prerequisites

| Tool | Required Version | Install |
|------|-----------------|---------|
| Node.js | 20.x+ | https://nodejs.org |
| Java | 21+ | `winget install Microsoft.OpenJDK.21` |
| Firebase CLI | Any | `npm install -g firebase-tools` |
| Playwright | Installed via npm | `npx playwright install --with-deps chromium webkit` |

## What It Does

The script mirrors every step of `.github/workflows/ci-cd.yml`:

```
┌────────────────────────────────────────────────────────┐
│  1. Prerequisites Check (Java, Node, Firebase CLI)     │
│  2. Lint & TypeScript Check (CI Job 1)                 │
│  3. Production Build (CI Job 2) — NOT dev server!      │
│  4. Start Firebase Emulators — clean state             │
│  5. Start Next.js Production Server                    │
│  6. Seed Test Data (ci-seed.ts)                        │
│  7. Smoke HTTP Tests (CI Job 3a)                       │
│  8. Smoke Auth Tests × 5 (CI Job 3b)                   │
│  9. Full E2E Tests × 20 groups (CI Job 4)              │
│ 10. Edge Case Tests (CI Job 5)                         │
│ 11. Cleanup + Summary Report                           │
└────────────────────────────────────────────────────────┘
```

## CLI Options

| Flag | Description | Example |
|------|-------------|---------|
| `-Suite` | Which suite to run: `all`, `lint`, `smoke-http`, `smoke-auth`, `e2e`, `edge`, `full` | `-Suite e2e` |
| `-Group` | Run specific E2E group (1-20) | `-Group 7` |
| `-SkipBuild` | Skip lint + typecheck + build | `-SkipBuild` |
| `-SkipLint` | Skip lint + typecheck only | `-SkipLint` |
| `-TestFile` | Run a single test file | `-TestFile "tests/e2e/wallet-withdrawals.spec.ts"` |
| `-Headed` | Show browser (for debugging) | `-Headed` |
| `-KeepRunning` | Don't kill emulators/server after tests | `-KeepRunning` |
| `-Retries` | Number of retries (default: 1, same as CI) | `-Retries 0` |

## Common Workflows

### Daily Development
```powershell
# Quick check before pushing
.\run-ci-local.ps1 -Suite smoke-auth -SkipBuild

# If smoke passes, run the full thing
.\run-ci-local.ps1 -SkipLint
```

### Debugging a Failing CI Group
```powershell
# CI says "Group 14" failed? Run exactly that group locally:
.\run-ci-local.ps1 -Suite e2e -Group 14 -SkipBuild

# Debug with visible browser
.\run-ci-local.ps1 -Suite e2e -Group 14 -Headed -SkipBuild
```

### Rapid Iteration on a Single Test
```powershell
# First run: start services and keep them alive
.\run-ci-local.ps1 -TestFile "tests/e2e/invoice.spec.ts" -KeepRunning

# Fix the code, then re-run without restarting anything
.\run-ci-local.ps1 -TestFile "tests/e2e/invoice.spec.ts" -SkipBuild -KeepRunning

# Repeat until green, then run the full suite
.\run-ci-local.ps1
```

## E2E Group Reference

| Group | Test Files |
|-------|-----------|
| 1 | edge-cases |
| 2 | beta-squad-batch-1 |
| 3 | beta-squad-batch-2 |
| 4 | beta-squad-batch-3 |
| 5 | beta-squad-batch-4 |
| 6 | beta-squad-batch-5 |
| 7 | complete-transaction-cycle |
| 8 | universal-master-audit |
| 9 | data-fetch-audit |
| 10 | dispute-refund-audit |
| 11 | admin-smoke, ui-audit-all-roles |
| 12 | beta-squad-case-1, budget-estimator |
| 13 | accessibility, analytics-dashboard, audit_wizard |
| 14 | desktop_user_flow, final-polish, invoice |
| 15 | offline-mode, partner-onboarding, performance |
| 16 | support-tickets, team-management, variation-orders |
| 17 | bulk-suite-verification, calendar-view, coordination-sync, coupons-discounts |
| 18 | milestones, mobile-responsiveness, mobile_user_flow, notifications-system |
| 19 | profile-settings, reviews, role-redirects, self-bid-protection |
| 20 | verify-new-features, wallet-withdrawals, ux-enhancements, role-switching, dashboard-financials |

## Troubleshooting

### "Firebase Emulators failed to start"
- Check if Java 21 is installed: `java -version`
- Check if ports are in use: `netstat -ano | findstr "9099 8080 9199"`
- Kill stale Java processes: `Get-Process java | Stop-Process -Force`

### "Next.js production server failed to start"
- Check if `.next` directory exists (run `npm run build` first)
- Check port 3000: `netstat -ano | findstr 3000`
- Check logs: `ci-local-server.log` and `ci-local-server-error.log`

### "Test data seeding failed"
- Ensure emulators are running: visit http://127.0.0.1:4000
- Check if `scripts/ci-seed.ts` exists
- Try manual seed: `npx tsx scripts/ci-seed.ts`

### Tests pass locally but fail in CI
- Make sure you're using `-Suite all` (not just smoke)
- CI uses production build, not dev server — don't use `npm run dev`
- Check if you have all env vars in `.env.local` (compare with `.env.example`)

### Tests fail locally but pass in CI
- Visual regression tests are skipped locally (Linux vs Windows rendering)
- Performance/Lighthouse tests are skipped locally (environment differences)
- Try with `-Retries 2` for flaky tests
