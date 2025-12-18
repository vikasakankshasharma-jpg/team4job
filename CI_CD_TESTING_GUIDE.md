# CI/CD Testing Guide

This document provides comprehensive information about the automated testing and CI/CD pipeline for the DoDo platform.

## Table of Contents

1. [Overview](#overview)
2. [Test Suites](#test-suites)
3. [Running Tests Locally](#running-tests-locally)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Test Coverage](#test-coverage)
6. [Troubleshooting](#troubleshooting)

## Overview

The DoDo platform uses **Playwright** for end-to-end testing with a comprehensive test suite covering:

- **Smoke Tests**: Quick validation of critical functionality
- **Full E2E Tests**: Complete transaction cycle testing
- **Edge Case Tests**: Boundary conditions and error handling

All tests are automatically run in the CI/CD pipeline on every push and pull request.

## Test Suites

### 1. Smoke Tests (`smoke.spec.ts`)

**Purpose**: Quick validation of critical user flows  
**Duration**: ~2-3 minutes  
**Coverage**:
- User authentication (Job Giver, Installer, Admin)
- Basic navigation
- Page accessibility
- Error handling for invalid credentials
- Console error detection

**Run Command**:
```bash
npm run test:smoke
```

**Tests Included**:
- ✅ User can login as Job Giver
- ✅ User can login as Installer
- ✅ User can login as Admin
- ✅ Job Giver can access Post Job page
- ✅ Installer can access Browse Jobs page
- ✅ Invalid login shows error
- ✅ Unauthenticated user redirected to login
- ✅ Application loads without console errors

### 2. Full E2E Tests (`complete-transaction-cycle.spec.ts`)

**Purpose**: Test complete job lifecycle from posting to completion  
**Duration**: ~15-20 minutes  
**Coverage**: End-to-end transaction flow

**Run Command**:
```bash
npm run test:full
```

**Test Phases**:
1. **Phase 1**: Job Giver posts a new job
2. **Phase 2**: Installer places a bid
3. **Phase 3**: Job Giver awards the job
4. **Phase 4**: Installer accepts the offer
5. **Phase 5**: Job Giver funds the project
6. **Phase 6**: Installer submits work
7. **Phase 7**: Job Giver approves and releases payment
8. **Phase 8**: Job Giver leaves review
9. **Phase 9**: Admin verifies transactions

### 3. Edge Case Tests (`edge-cases.spec.ts`)

**Purpose**: Test boundary conditions, error handling, and security  
**Duration**: ~10-15 minutes  
**Coverage**: Unusual scenarios and edge cases

**Run Command**:
```bash
npm run test:edge-cases
```

**Test Categories**:

#### Authentication Edge Cases
- Empty credentials validation
- Invalid email format
- SQL injection prevention
- Multiple failed login attempts
- Session persistence after reload

#### Job Posting Edge Cases
- Minimum required fields only
- Extremely long descriptions
- Invalid budget range (min > max)
- Past deadline dates
- Special characters in title
- Invalid pincode handling
- XSS prevention

#### Bidding Edge Cases
- Bid below minimum budget
- Bid above maximum budget
- Empty cover letter
- Multiple bids on same job

#### Search and Filter Edge Cases
- Search with no results
- Special characters in search
- Very long search queries

#### File Upload Edge Cases
- Invalid file types
- Files exceeding size limits

#### Network and Performance Edge Cases
- Slow network handling
- Offline mode gracefully handled
- Concurrent user actions

#### Browser Compatibility Edge Cases
- Browser back/forward button handling
- Page refresh during form fill

#### Data Validation Edge Cases
- XSS prevention in user inputs
- Unicode and emoji handling

## Running Tests Locally

### Prerequisites

1. **Node.js** (v20.x or higher)
2. **npm** packages installed
3. **Local development server** running on `http://localhost:3000`
4. **Test accounts** seeded in Firebase

### Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Seed test data (if needed)
npm run db:seed
```

### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:debug
```

### Run Specific Test Suites

```bash
# Smoke tests only
npm run test:smoke

# Full E2E tests only
npm run test:full

# Edge case tests only
npm run test:edge-cases
```

### View Test Reports

```bash
# Open HTML report
npm run test:report
```

## CI/CD Pipeline

The CI/CD pipeline is defined in `.github/workflows/ci-cd.yml` and runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

### Pipeline Jobs

#### 1. Lint & Type Check
- Runs ESLint
- Runs TypeScript type checking
- **Duration**: ~1-2 minutes

#### 2. Build Application
- Builds Next.js application
- Uploads build artifacts
- **Duration**: ~3-5 minutes

#### 3. Smoke Tests
- Runs smoke test suite
- Uploads test reports
- **Duration**: ~3-4 minutes

#### 4. Full E2E Tests
- Runs complete transaction cycle tests
- Uploads test reports
- **Duration**: ~20-25 minutes

#### 5. Edge Case Tests
- Runs edge case test suite
- Uploads test reports
- **Duration**: ~15-20 minutes

#### 6. Test Summary
- Generates comprehensive test summary
- Shows all test results

#### 7. Deploy (Main Branch Only)
- Deploys to Firebase App Hosting
- Only runs on successful tests
- **Duration**: ~5-10 minutes

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_SERVICE_ACCOUNT
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
CASHFREE_PAYMENTS_CLIENT_ID
CASHFREE_SECRET_KEY
CASHFREE_PAYOUTS_CLIENT_SECRET
CASHFREE_CLIENT_SECRET
```

### Viewing CI/CD Results

1. Go to **Actions** tab in GitHub repository
2. Click on the workflow run
3. View individual job results
4. Download test artifacts for detailed reports

## Test Coverage

### Current Coverage

| Category | Coverage |
|----------|----------|
| Authentication | ✅ 100% |
| Job Posting | ✅ 95% |
| Bidding | ✅ 90% |
| Payment Flow | ✅ 85% |
| Admin Functions | ✅ 80% |
| Edge Cases | ✅ 75% |

### Coverage Goals

- **Critical Paths**: 100% coverage
- **User Flows**: 95% coverage
- **Edge Cases**: 80% coverage
- **Error Handling**: 90% coverage

## Troubleshooting

### Common Issues

#### 1. Tests Failing Locally

**Problem**: Tests pass in CI but fail locally

**Solution**:
```bash
# Clear Playwright cache
npx playwright install --force

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

#### 2. Timeout Errors

**Problem**: Tests timeout waiting for elements

**Solution**:
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify network connectivity

#### 3. Authentication Failures

**Problem**: Login tests fail

**Solution**:
- Verify test accounts exist in Firebase
- Check environment variables
- Run `npm run db:seed` to reset test data

#### 4. Flaky Tests

**Problem**: Tests pass/fail intermittently

**Solution**:
- Add explicit waits for dynamic content
- Use `waitForLoadState('networkidle')`
- Increase retry count in CI

#### 5. CI Pipeline Failures

**Problem**: Pipeline fails on specific jobs

**Solution**:
- Check GitHub Actions logs
- Verify all secrets are configured
- Ensure Firebase APIs are enabled

### Debug Commands

```bash
# Run specific test file
npx playwright test tests/e2e/smoke.spec.ts

# Run specific test by name
npx playwright test -g "User can login as Job Giver"

# Run with debug mode
npx playwright test --debug

# Generate trace
npx playwright test --trace on

# Show trace viewer
npx playwright show-trace trace.zip
```

### Getting Help

1. Check test output and error messages
2. Review Playwright documentation: https://playwright.dev
3. Check GitHub Actions logs
4. Review test helper functions in `tests/utils/helpers.ts`

## Best Practices

### Writing Tests

1. **Use Test Helpers**: Leverage `TestHelper` class for common operations
2. **Descriptive Names**: Use clear, descriptive test names
3. **Independent Tests**: Each test should be independent
4. **Clean Up**: Reset state after tests if needed
5. **Assertions**: Use meaningful assertions with timeout

### Maintaining Tests

1. **Keep Tests Updated**: Update tests when features change
2. **Review Failures**: Investigate and fix failing tests promptly
3. **Refactor**: Keep test code DRY and maintainable
4. **Document**: Add comments for complex test logic

### Performance

1. **Parallel Execution**: Run independent tests in parallel
2. **Selective Testing**: Run only relevant tests during development
3. **Optimize Waits**: Use appropriate wait strategies
4. **Cache**: Leverage browser and build caching

## Continuous Improvement

### Metrics to Track

- Test execution time
- Test failure rate
- Code coverage
- Flaky test rate
- CI/CD pipeline duration

### Future Enhancements

- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Accessibility testing (a11y)
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile viewport testing
- [ ] API testing
- [ ] Load testing
- [ ] Security testing

---

**Last Updated**: December 2025  
**Maintained By**: Development Team
