# GitHub Actions Workflows

This directory contains GitHub Actions workflow files for the DoDo platform's CI/CD pipeline.

## Workflows

### 1. `ci-cd.yml` - Main CI/CD Pipeline

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

**Jobs:**

1. **Lint & Type Check** - Code quality validation
2. **Build Application** - Next.js build verification
3. **Smoke Tests** - Quick critical functionality validation
4. **Full E2E Tests** - Complete transaction cycle testing
5. **Edge Case Tests** - Boundary conditions and error handling
6. **Test Summary** - Consolidated test results
7. **Deploy** - Firebase deployment (main branch only)

**Duration:** ~30-40 minutes

### 2. `scheduled-tests.yml` - Daily Test Suite

**Triggers:**
- Scheduled daily at 2 AM UTC
- Manual workflow dispatch

**Jobs:**

1. **Daily Full Test** - Runs complete test suite
2. **Notification** - Creates GitHub issue on failure

**Duration:** ~45-60 minutes

## Required Secrets

Configure these in **Settings → Secrets and variables → Actions**:

### Firebase Configuration
```
FIREBASE_PROJECT_ID          # Your Firebase project ID
FIREBASE_CLIENT_EMAIL        # Service account email
FIREBASE_PRIVATE_KEY         # Service account private key
FIREBASE_SERVICE_ACCOUNT     # Full service account JSON
```

### API Keys
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  # Google Maps API key
GEMINI_API_KEY                    # Google Gemini API key
```

### Payment Gateway (Cashfree)
```
CASHFREE_PAYMENTS_CLIENT_ID      # Cashfree payments client ID
CASHFREE_SECRET_KEY              # Cashfree secret key
CASHFREE_PAYOUTS_CLIENT_SECRET   # Cashfree payouts secret
CASHFREE_CLIENT_SECRET           # Cashfree client secret
```

### GitHub
```
GITHUB_TOKEN  # Automatically provided by GitHub Actions
```

## Workflow Features

### Parallel Execution
- Smoke tests run first as a gate
- Full E2E and Edge Case tests run in parallel after smoke tests pass
- Build job runs independently

### Artifact Management
- Test reports retained for 7 days
- Build artifacts retained for 1 day
- Daily test results retained for 30 days

### Error Handling
- Tests retry 2 times on CI
- Continue on ESLint errors (warnings only)
- Automatic issue creation on scheduled test failures

### Optimization
- npm cache enabled
- Playwright browser caching
- Conditional deployment (main branch only)

## Local Testing

Before pushing, test the workflow locally:

```bash
# Run smoke tests
npm run test:smoke

# Run full E2E tests
npm run test:full

# Run edge case tests
npm run test:edge-cases

# Run all tests
npm run test:e2e
```

## Monitoring

### View Workflow Runs
1. Go to **Actions** tab in GitHub
2. Select workflow from left sidebar
3. Click on specific run to view details

### Download Artifacts
1. Navigate to workflow run
2. Scroll to **Artifacts** section
3. Download test reports

### Check Test Results
1. Download test artifacts
2. Extract `playwright-report` folder
3. Open `index.html` in browser

## Troubleshooting

### Workflow Fails on Secrets
- Verify all required secrets are configured
- Check secret names match exactly (case-sensitive)
- Ensure no extra spaces in secret values

### Tests Timeout
- Increase timeout in `playwright.config.ts`
- Check if Firebase services are accessible
- Verify test data is seeded

### Build Fails
- Check TypeScript errors locally: `npm run typecheck`
- Verify all dependencies are in `package.json`
- Ensure environment variables are set

### Deployment Fails
- Verify Firebase service account has correct permissions
- Check Firebase App Hosting is enabled
- Ensure project ID matches

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep secrets updated** when credentials change
3. **Monitor workflow runs** regularly
4. **Fix failing tests** immediately
5. **Review test reports** for flaky tests

## Maintenance

### Adding New Tests
1. Create test file in `tests/e2e/`
2. Add npm script in `package.json`
3. Add job to `ci-cd.yml` if needed
4. Update this README

### Modifying Workflows
1. Test changes in a branch first
2. Use `workflow_dispatch` for manual testing
3. Monitor first few runs carefully
4. Document changes in this README

### Updating Dependencies
1. Update `NODE_VERSION` in workflow files
2. Update Playwright version in `package.json`
3. Test locally before committing

## Support

For issues with workflows:
1. Check GitHub Actions logs
2. Review Playwright documentation
3. Consult CI/CD Testing Guide
4. Contact development team

---

**Last Updated:** December 2025  
**Maintained By:** Development Team
