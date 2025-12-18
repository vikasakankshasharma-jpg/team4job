# Testing Quick Reference

## 🚀 Quick Start

```bash
# Start dev server (required)
npm run dev

# Run smoke tests (3 min)
npm run test:smoke

# Run full E2E tests (20 min)
npm run test:full

# Run edge case tests (15 min)
npm run test:edge-cases

# View test report
npm run test:report
```

## 📋 Test Suites

| Command | Duration | Tests | Purpose |
|---------|----------|-------|---------|
| `test:smoke` | 3 min | 8 | Critical functionality |
| `test:full` | 20 min | 9 phases | Complete transaction |
| `test:edge-cases` | 15 min | 50+ | Edge cases & errors |
| `test:e2e` | 40 min | All | Full test suite |

## 🎯 Common Commands

```bash
# Interactive UI mode
npm run test:e2e:ui

# See browser (headed mode)
npm run test:e2e:headed

# Debug specific test
npm run test:debug

# Run specific test file
npx playwright test tests/e2e/smoke.spec.ts

# Run specific test by name
npx playwright test -g "User can login"

# Update snapshots
npx playwright test --update-snapshots
```

## 🔧 PowerShell Script

```powershell
# Run all tests with summary
.\run-tests.ps1

# Run specific suite
.\run-tests.ps1 -TestSuite smoke
.\run-tests.ps1 -TestSuite full
.\run-tests.ps1 -TestSuite edge

# With options
.\run-tests.ps1 -Headed      # See browser
.\run-tests.ps1 -UI          # Interactive mode
.\run-tests.ps1 -Debug       # Debug mode
```

## 🐛 Debugging

```bash
# Run with debug
npm run test:debug

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip

# Screenshots on failure (automatic)
# Videos on failure (automatic)
```

## ✅ Pre-Push Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Run smoke tests (`npm run test:smoke`)
- [ ] All tests passing
- [ ] No console errors
- [ ] TypeScript check (`npm run typecheck`)

## 🔍 Troubleshooting

### Tests Timeout
```bash
# Increase timeout in playwright.config.ts
timeout: 120000  # 2 minutes
```

### Authentication Fails
```bash
# Reset test data
npm run db:seed
```

### Flaky Tests
```bash
# Add retry in playwright.config.ts
retries: 2
```

### Clear Cache
```bash
# Clear Playwright
npx playwright install --force

# Clear Next.js
rm -rf .next
```

## 📊 Test Reports

```bash
# View HTML report
npm run test:report

# JSON report location
test-results/results.json

# Screenshots location
test-results/

# Videos location
test-results/
```

## 🌐 CI/CD

### Triggers
- Push to `main` or `develop`
- Pull requests
- Daily at 2 AM UTC
- Manual (Actions tab)

### View Results
1. Go to **Actions** tab
2. Click workflow run
3. Download artifacts

## 📝 Test Accounts

```javascript
// Job Giver
email: 'jobgiver@example.com'
password: 'Vikas@129229'

// Installer
email: 'installer@example.com'
password: 'Vikas@129229'

// Admin
email: 'vikasakankshasharma@gmail.com'
password: 'Vikas@129229'
```

## 🎨 Test Helpers

```typescript
const helper = new TestHelper(page);

// Authentication
await helper.auth.loginAsJobGiver();
await helper.auth.loginAsInstaller();
await helper.auth.loginAsAdmin();
await helper.auth.logout();

// Navigation
await helper.nav.goToPostJob();
await helper.nav.goToBrowseJobs();
await helper.nav.goToMyBids();

// Forms
await helper.form.fillInput('Label', 'value');
await helper.form.clickButton('Submit');
await helper.form.waitForToast('Success');

// Jobs
const jobId = await helper.job.getJobIdFromUrl();
await helper.job.waitForJobStatus('Completed');

// Wait
await helper.wait.waitForNetworkIdle();
await helper.wait.waitForUrl(/dashboard/);
```

## 📚 Documentation

- **CI_CD_TESTING_GUIDE.md** - Complete guide
- **TEST_IMPLEMENTATION_SUMMARY.md** - Implementation details
- **.github/workflows/README.md** - Workflow docs
- **E2E_TESTING_GUIDE.md** - E2E testing guide

## 🆘 Getting Help

1. Check error message
2. Review test output
3. Check Playwright docs
4. Review helper functions
5. Ask team

---

**Quick Tip:** Always run `npm run test:smoke` before pushing!
