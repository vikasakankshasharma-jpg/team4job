# Automated Testing Guide

## Overview
This project uses **Playwright** for end-to-end (E2E) testing. The test suite covers the complete transaction cycle and includes smoke tests for quick validation.

---

## 🚀 Quick Start

### Run All Tests (25+ Scenarios)
```bash
npm run test:e2e
```

### Run Smoke Tests Only (Admin & Basic Flows)
```bash
npm run test:smoke
```

### Run Edge Cases
```bash
npm run test:edge-cases
```

### Run Full Regression (Invert Smoke/Edge)
```bash
npm run test:regression
```

*(Note: Use standard `npx playwright test --ui` for interactive mode or `npx playwright test --debug` for debugging).*

---

## 📁 Test Structure

```
tests/
├── e2e/                                    # E2E test files
│   ├── smoke.spec.ts                       # Quick smoke tests
│   └── complete-transaction-cycle.spec.ts  # Full E2E test
├── fixtures/                               # Test data and constants
│   └── test-data.ts                        # Test credentials, job data
└── utils/                                  # Helper utilities
    └── helpers.ts                          # Test helper classes
```

---

## 🧪 Test Suites

### 1. Smoke Tests (`smoke.spec.ts`, `admin-smoke.spec.ts`)
Quick validation tests that ensure basic platform stability:
- ✅ Login as Job Giver, Installer, Admin
- ✅ Access key pages (Post Job, Browse Jobs)
- ✅ Admin dashboard access verification

**Run**: `npm run test:smoke`

### 2. Edge Cases (`edge-cases.spec.ts`)
Deep checks for unexpected user behavior:
- ✅ Invalid budget handling
- ✅ Deadline boundary testing
- ✅ Missing KYC or payment setups

**Run**: `npm run test:edge-cases`

### 3. Full Regression (`tests/e2e/`)
The platform has over 25+ specific test files covering every domain:
- `beta-squad-all.spec.ts` (Major user flows)
- `budget-estimator.spec.ts`
- `mobile_user_flow.spec.ts`
- `self-bid-protection.spec.ts`

**Run**: `npm run test:regression`

---

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium (default)
- **Timeout**: 120 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

### Test Data (`tests/fixtures/test-data.ts`)
All test credentials and constants are centralized:
- Test accounts (Job Giver, Installer, Admin)
- Test credentials (Aadhar, OTP, test cards)
- Job data templates
- Routes and timeouts

---

## 📝 Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test('My test', async ({ page }) => {
  const helper = new TestHelper(page);
  
  // Login
  await helper.auth.loginAsJobGiver();
  
  // Navigate
  await helper.nav.goToPostJob();
  
  // Fill form
  await helper.form.fillInput('Job Title', 'Test Job');
  await helper.form.clickButton('Post Job');
  
  // Verify
  await helper.form.waitForToast('Success!');
  await expect(page).toHaveURL(/\/posted-jobs/);
});
```

### Available Helper Classes

#### `AuthHelper`
```typescript
await helper.auth.loginAsJobGiver();
await helper.auth.loginAsInstaller();
await helper.auth.loginAsAdmin();
await helper.auth.login(email, password);
await helper.auth.logout();
```

#### `FormHelper`
```typescript
await helper.form.fillInput('Label', 'value');
await helper.form.fillTextarea('Label', 'value');
await helper.form.selectDropdown('Label', 'option');
await helper.form.clickButton('Button Text');
await helper.form.waitForToast('Success message');
await helper.form.waitForErrorToast();
```

#### `NavigationHelper`
```typescript
await helper.nav.goToPostJob();
await helper.nav.goToPostedJobs();
await helper.nav.goToBrowseJobs();
await helper.nav.goToMyBids();
await helper.nav.goToTransactions();
await helper.nav.goToDashboard();
```

#### `JobHelper`
```typescript
const jobId = await helper.job.getJobIdFromUrl();
const jobId = await helper.job.getJobIdFromCard();
await helper.job.clickJobCard('Job Title');
await helper.job.waitForJobStatus('Completed');
const status = await helper.job.getJobStatus();
```

#### `WaitHelper`
```typescript
await helper.wait.waitForNetworkIdle();
await helper.wait.waitForElement('selector');
await helper.wait.waitForText('text');
await helper.wait.waitForUrl(/pattern/);
```

#### `DebugHelper`
```typescript
await helper.debug.takeScreenshot('screenshot-name');
helper.debug.logConsoleErrors();
helper.debug.logNetworkErrors();
const errors = await helper.debug.getPageErrors();
```

---

## 🐛 Debugging Tests

### 1. Run in Debug Mode
```bash
npm run test:debug
```
This opens Playwright Inspector where you can:
- Step through tests
- Inspect page state
- View console logs
- Take screenshots

### 2. Run in Headed Mode
```bash
npm run test:e2e:headed
```
Watch the browser execute tests in real-time.

### 3. Use UI Mode
```bash
npm run test:e2e:ui
```
Interactive UI to run, debug, and explore tests.

### 4. View Traces
After a test failure:
```bash
npm run test:report
```
Click on a failed test to view:
- Screenshots
- Videos
- Traces (timeline of actions)
- Network requests
- Console logs

---

## 📊 Test Reports

### View HTML Report
After running tests, you can view the detailed graphical report via Playwright:
```bash
npx playwright show-report
```

### JSON Report
Results are also saved to `test-results/results.json` for CI/CD integration.

---

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## ⚙️ Environment Variables

Tests use the same environment variables as the application:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- etc.

Ensure `.env.local` is properly configured before running tests.

---

## 🎯 Best Practices

### 1. Use Test Helpers
Always use helper classes instead of raw Playwright API:
```typescript
// ✅ Good
await helper.form.fillInput('Job Title', 'Test');

// ❌ Avoid
await page.fill('input[name="jobTitle"]', 'Test');
```

### 2. Use Descriptive Test Names
```typescript
// ✅ Good
test('Job Giver can post a new job successfully');

// ❌ Avoid
test('test1');
```

### 3. Keep Tests Independent
Each test should be able to run independently:
```typescript
test.beforeEach(async ({ page }) => {
  // Setup for each test
  await helper.auth.loginAsJobGiver();
});
```

### 4. Use Proper Waits
```typescript
// ✅ Good - Wait for specific condition
await helper.form.waitForToast('Success!');

// ❌ Avoid - Arbitrary waits
await page.waitForTimeout(5000);
```

### 5. Clean Up After Tests
```typescript
test.afterEach(async ({ page }) => {
  // Cleanup if needed
  await helper.auth.logout();
});
```

---

## 🚨 Common Issues

### Issue: Tests fail with "Timeout" error
**Solution**: 
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify network connectivity

### Issue: "Element not found" errors
**Solution**:
- Use more specific selectors
- Add waits before interactions
- Check if element is visible: `await expect(element).toBeVisible()`

### Issue: Payment tests fail
**Solution**:
- Verify Cashfree is in TEST mode
- Check test card credentials in `test-data.ts`
- Ensure `.env.local` has correct Cashfree keys

### Issue: Tests pass locally but fail in CI
**Solution**:
- Add `--with-deps` when installing Playwright in CI
- Increase timeouts for CI environment
- Check environment variables are set in CI

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Test Fixtures Guide](https://playwright.dev/docs/test-fixtures)

---

## 🤝 Contributing

When adding new tests:
1. Follow existing test structure
2. Use helper classes
3. Add test data to `test-data.ts`
4. Update this README if adding new test suites
5. Ensure tests pass locally before committing

---

## 📞 Support

For issues or questions:
1. Check this README
2. Review Playwright documentation
3. Check test output and traces
4. Contact the development team

---

**Last Updated**: 2025-12-17  
**Playwright Version**: 1.57.0  
**Node Version**: 20+
