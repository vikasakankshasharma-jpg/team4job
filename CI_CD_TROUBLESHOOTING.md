# CI/CD Pipeline - Troubleshooting & Maintenance Guide

## Quick Reference

| Job | Duration | Purpose | Triggers |
|-----|----------|---------|----------|
| Lint & Type Check | 2-3 min | Code quality | Every PR/Push |
| Build | 5-7 min | Create production build | Every PR/Push |
| Smoke Tests | 5-8 min | Basic functionality | Every PR/Push |
| E2E Tests (3 shards) | 15-20 min | Full feature tests | Every PR/Push |
| Edge Cases | 10-15 min | Boundary conditions | Every PR/Push |

---

## Understanding Test Execution

### Workflow Triggers
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:  # Manual trigger via GitHub UI
```

**When tests run:**
- ✅ Every push to `main` or `develop` branches
- ✅ Every pull request to these branches
- ✅ Manual trigger from GitHub Actions UI
- ✅ Scheduled (if configured)

### Sharded E2E Tests
The E2E test suite is split across 3 parallel jobs:
```
Shard 1/3: tests/e2e/admin-smoke.spec.ts, analytics-dashboard.spec.ts
Shard 2/3: tests/e2e/beta-squad-all.spec.ts, job-posting.spec.ts
Shard 3/3: tests/e2e/installers.spec.ts, messages.spec.ts, ...
```

**Benefit:** Speeds up overall test execution (15-20 min instead of 45+ min)

---

## Common Issues & Solutions

### 1. Workflow Fails Immediately

**Error:** "ENOENT: no such file or directory"

**Causes:**
- Dependencies not installed
- Build artifacts corrupted
- Node version mismatch

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Push changes
git push origin main
```

---

### 2. Lint or Type Errors Fail Build

**Error:** "ESLint found 5 errors"

**Cause:** Code doesn't pass linting/typing standards

**Solutions:**
1. Fix errors locally first:
```bash
npm run lint
npm run typecheck
```

2. Let ESLint fix automatically:
```bash
npx eslint . --fix
```

3. Push fixed code:
```bash
git add .
git commit -m "fix: ESLint violations"
git push origin main
```

---

### 3. Smoke Tests Fail

**Error:** "Tests timed out or failed"

**Possible Causes:**
- Server didn't start
- Firebase credentials invalid
- Network connectivity issue

**Debug:**
1. Check workflow logs for error messages
2. Run locally first:
```bash
npm run emulators &
npm run dev -- -p 5000 &
npm run test:smoke
```

3. Check if issue is environment-specific (only in CI)

---

### 4. E2E Tests Timeout After 45 Minutes

**Error:** "timeout of 45 minutes exceeded"

**Causes:**
- Tests running too slowly
- Network latency in GitHub Actions
- Database queries timing out

**Solutions:**
1. **Increase timeout in GitHub workflow** (edit `.github/workflows/ci-cd.yml`):
```yaml
e2e-tests:
  timeout-minutes: 60  # Increase from 45 to 60
```

2. **Reduce parallel workers** to avoid resource contention:
```bash
npx playwright test --workers=1  # More stable but slower
```

3. **Skip slow tests temporarily:**
```bash
npx playwright test --grep-invert "@slow|@skip"
```

---

### 5. Firebase Credentials Error

**Error:** "Failed to initialize Firebase Admin SDK. Missing credentials"

**Cause:** GitHub secrets not configured

**Solution:**
1. Verify all Firebase secrets exist in GitHub:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

2. Check format of `FIREBASE_PRIVATE_KEY`:
```
Should start with: -----BEGIN PRIVATE KEY-----
Should end with:   -----END PRIVATE KEY-----
```

3. Recreate secret if corrupted:
```bash
# Generate new private key from Firebase Console
# Settings → Service Accounts → Generate New Private Key
# Copy entire content and paste in GitHub secret
```

---

### 6. Tests Pass Locally But Fail in CI

**Causes:**
- Environment variable differences
- Timing issues (CI is slower)
- Network issues

**Debug Steps:**
1. Match CI environment locally:
```bash
CI=true npm run test:e2e
```

2. Increase timeout in playwright.config.ts:
```typescript
timeout: 180000  // Increase from default
```

3. Add debug output:
```typescript
test.beforeEach(async ({ page }) => {
  console.log(`[TEST] Running on: ${process.platform}`);
  console.log(`[TEST] CI: ${process.env.CI}`);
});
```

---

### 7. "Artifact Download Failed"

**Error:** "failed to download artifact"

**Cause:** Artifacts expired or workflow cancelled mid-execution

**Solution:**
1. Re-run workflow:
```
GitHub Actions → Workflow → Re-run failed jobs
```

2. Or manually re-trigger:
```
Actions → CI/CD Pipeline → Run workflow
```

---

## Performance Optimization

### Reduce Test Execution Time

**Current baseline:** ~20-25 minutes for full suite

**Optimization strategies:**

1. **Parallel Execution:**
```bash
npx playwright test --workers=4  # Default is usually 2
```

2. **Only Run Changed Tests:**
```bash
npx playwright test --grep "@smoke"  # Only smoke tests
```

3. **Skip E2E in Drafts:**
Add to workflow:
```yaml
- name: Run E2E Tests
  if: ${{ !github.event.pull_request.draft }}
  run: npm run test:e2e
```

4. **Use Test Sharding:**
```bash
# Already implemented - 3 shards run in parallel
npx playwright test --shard=1/3
npx playwright test --shard=2/3
npx playwright test --shard=3/3
```

---

## Monitoring & Alerts

### View Test Results

1. **Via GitHub Actions UI:**
   - Go to Actions → [Workflow Name] → [Run]
   - Click job to see logs
   - Download artifacts (screenshots, videos)

2. **Via Artifacts:**
   - Actions → [Run] → Artifacts
   - Download `e2e-test-report-[shard]`

3. **View HTML Report:**
```bash
# After downloading artifact
unzip e2e-test-report-1.zip
open playwright-report/index.html
```

### Set Up Notifications (Optional)

**Slack Notification on Failure:**
Add to `.github/workflows/ci-cd.yml`:
```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: "E2E Tests Failed: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Best Practices

✅ **Do:**
- Run tests locally first before pushing
- Review test failures immediately
- Keep dependencies updated
- Document flaky tests
- Rotate credentials quarterly

❌ **Don't:**
- Ignore failing tests (they indicate real issues)
- Commit secrets to Git
- Skip tests to speed up deployment
- Use production credentials in CI
- Let test suite rot

---

## Deployment Workflow

**Recommended process:**

1. **Create Feature Branch**
```bash
git checkout -b feature/new-feature
```

2. **Develop & Test Locally**
```bash
npm run dev
npm run test:e2e
```

3. **Push & Create PR**
```bash
git push origin feature/new-feature
# Create PR on GitHub
```

4. **Wait for CI/CD**
   - All checks must pass
   - Review test report
   - Review code changes

5. **Merge to Main**
   - GitHub automatically runs full test suite
   - If all pass, ready for production deployment

6. **Monitor Production**
   - Check error rates
   - Monitor performance
   - Verify functionality

---

## Advanced Debugging

### Enable Debug Mode

```bash
# Run tests with debug output
DEBUG=pw:api npm run test:e2e
```

### Generate Test Report

```bash
# After test run
npx playwright show-report

# Or serve HTML report
cd playwright-report
python -m http.server 8000
```

### Trace Test Execution

```bash
# Enable trace capture in playwright.config.ts
trace: 'on-first-retry'  # Already enabled

# View traces
npx playwright show-trace trace.zip
```

---

## Emergency Procedures

### Temporarily Disable Tests

If tests are causing pipeline to block deployment:

1. **Edit workflow file:**
```yaml
e2e-tests:
  continue-on-error: true  # Don't block if fails
```

2. **Or skip entirely (temporary):**
```yaml
- name: Run E2E Tests
  if: false  # Skips this job
  run: npm run test:e2e
```

3. **Then fix and re-enable:**
```yaml
if: true  # Re-enable
```

### Rollback Failed Deployment

```bash
git revert <commit-hash>
git push origin main
# New CI/CD run will verify rollback
```

---

## Resources

- **Playwright Docs:** https://playwright.dev/docs/debug
- **GitHub Actions Debugging:** https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/about-workflow-runs
- **Firebase Emulator:** https://firebase.google.com/docs/emulator-suite
- **Test Reports:** `playwright-report/index.html`

---

## Contact & Support

For issues not covered here:
1. Check test logs in GitHub Actions
2. Run tests locally with DEBUG mode
3. Review test artifacts (videos/screenshots)
4. Contact development team

