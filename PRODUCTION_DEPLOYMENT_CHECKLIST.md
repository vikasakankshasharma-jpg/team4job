# Production Deployment Checklist

## Pre-Deployment Phase (Week Before Launch)

### GitHub Configuration
- [ ] Repository created and configured
- [ ] Branches `main` and `develop` created
- [ ] Branch protection rules set up:
  - [ ] Require status checks to pass (CI/CD pipeline)
  - [ ] Require code review (minimum 2 reviewers)
  - [ ] Require branches to be up to date
  - [ ] Dismiss stale reviews
- [ ] All GitHub secrets configured (see GITHUB_SECRETS_SETUP.md)

### Test Infrastructure
- [ ] All 119 tests configured
- [ ] Smoke tests passing locally
- [ ] E2E tests passing locally
- [ ] Test timeouts appropriate (180s per test)
- [ ] Firebase Emulator settings correct
- [ ] Playwright configurations reviewed

### Environment Setup
- [ ] `.env.local` contains all required credentials
- [ ] `.env.test` configured for emulator
- [ ] Firebase project created (or credentials provided)
- [ ] API keys obtained (Google Maps, Cashfree, Gemini, etc.)
- [ ] Sentry project created (optional but recommended)

### CI/CD Pipeline
- [ ] GitHub Actions workflow file configured (`.github/workflows/ci-cd.yml`)
- [ ] All jobs defined and tested:
  - [ ] Lint & Type Check
  - [ ] Build
  - [ ] Smoke Tests
  - [ ] E2E Tests (3 shards)
  - [ ] Edge Case Tests
- [ ] Artifact upload configured (7-day retention)
- [ ] Timeout values appropriate

---

## Pre-Deployment Testing Phase (3-5 Days Before Launch)

### Automated Testing
- [ ] Run full CI/CD pipeline locally:
```bash
npm run lint
npm run typecheck
npm run build
npm run test:smoke
npm run test:e2e
```

- [ ] All tests pass without errors
- [ ] No flaky tests detected
- [ ] Test artifacts generate correctly
  - [ ] Screenshots captured on failure
  - [ ] Videos recorded
  - [ ] HTML report generated

### Manual Testing
- [ ] Test critical user flows manually:
  - [ ] User signup
  - [ ] Job posting
  - [ ] Job search
  - [ ] Payment flow
  - [ ] User messaging
- [ ] Test in multiple browsers (Chrome, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test in different timezones

### Performance Testing
- [ ] Page load times acceptable (< 3s)
- [ ] No console errors
- [ ] Network requests optimized
- [ ] Database queries performant
- [ ] File uploads working

### Security Testing
- [ ] No secrets in code or git history
- [ ] Environment variables protected
- [ ] API endpoints authenticated
- [ ] CORS properly configured
- [ ] Input validation working

---

## GitHub Actions - First Run

### Initial Trigger
- [ ] Push a test commit to `main` branch
- [ ] GitHub Actions workflow starts automatically
- [ ] Monitor workflow execution:
  - [ ] Lint job passes (✓ or ✗)
  - [ ] Build job passes (✓ or ✗)
  - [ ] Smoke tests pass (✓ or ✗)
  - [ ] E2E tests pass (✓ or ✗)
  - [ ] Edge case tests pass (✓ or ✗)

### Artifact Verification
- [ ] All artifacts generated successfully
- [ ] Download `e2e-test-report-[shard]` artifacts
- [ ] Extract and view `playwright-report/index.html`
- [ ] Verify test execution times
- [ ] Check for flaky tests (retried tests)

### Troubleshooting
- [ ] If pipeline fails, check:
  - [ ] GitHub secrets configured correctly
  - [ ] Node version compatible
  - [ ] All dependencies installed
  - [ ] Environment variables correct
  - [ ] Firebase credentials valid
- [ ] Debug using logs in GitHub Actions UI
- [ ] Reference CI_CD_TROUBLESHOOTING.md guide

---

## Deployment Phase (Go-Live Day)

### Final Checks (1 Hour Before Launch)

**Code Quality:**
- [ ] All tests passing
- [ ] No critical bugs in logs
- [ ] Code review approved
- [ ] Branch is up to date

**Performance:**
- [ ] Load testing shows acceptable performance
- [ ] Database response times < 200ms
- [ ] API endpoints responding correctly
- [ ] Error rate < 0.5%

**Security:**
- [ ] SSL/TLS certificate valid
- [ ] Firewall rules configured
- [ ] API rate limiting enabled
- [ ] CORS headers correct

**Monitoring:**
- [ ] Sentry connected and monitoring errors
- [ ] Analytics tracking working
- [ ] Logging configured
- [ ] Alerts set up for critical errors

### Deployment

**Method 1: Vercel Deployment**
- [ ] Connect GitHub repository to Vercel
- [ ] Set production environment variables
- [ ] Trigger production build
- [ ] Verify deployment successful
- [ ] Run smoke tests against production

**Method 2: Firebase App Hosting**
- [ ] Configure Firebase App Hosting
- [ ] Set production environment variables
- [ ] Deploy using `firebase deploy`
- [ ] Verify deployment successful
- [ ] Run smoke tests against production

**Method 3: Docker Container**
- [ ] Build Docker image: `docker build -t team4job:latest .`
- [ ] Test locally: `docker run -p 3000:3000 team4job:latest`
- [ ] Push to registry: `docker push registry.example.com/team4job:latest`
- [ ] Deploy to production environment
- [ ] Run smoke tests against production

### Post-Deployment Verification

**Immediate (First 5 Minutes)**
- [ ] Website loads without errors
- [ ] No 500 errors in Sentry
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Authentication working

**First Hour**
- [ ] Smoke tests still passing
- [ ] User registrations and logins working
- [ ] Jobs posting successfully
- [ ] Payments processing (if enabled)
- [ ] No unusual error patterns

**First Day**
- [ ] E2E tests passing against production
- [ ] User feedback monitored
- [ ] Performance metrics normal
- [ ] Error rates acceptable
- [ ] No security incidents

---

## Post-Deployment Phase

### Monitoring & Maintenance

**Daily:**
- [ ] Check error rates in Sentry
- [ ] Review test results from scheduled runs
- [ ] Monitor performance metrics
- [ ] Check user feedback/support tickets

**Weekly:**
- [ ] Review CI/CD pipeline execution times
- [ ] Identify and optimize slow tests
- [ ] Update dependencies (if needed)
- [ ] Review security alerts

**Monthly:**
- [ ] Rotate API credentials
- [ ] Review and update test coverage
- [ ] Analyze user behavior metrics
- [ ] Plan next feature releases

### Test Maintenance

**Add Tests For:**
- [ ] New features implemented
- [ ] Bug fixes (regression prevention)
- [ ] User-reported issues
- [ ] Edge cases discovered

**Update Tests When:**
- [ ] API changes
- [ ] UI components change
- [ ] User flows change
- [ ] Database schema changes

**Remove Tests When:**
- [ ] Feature is deprecated
- [ ] Test consistently fails/flaky
- [ ] Test is redundant
- [ ] Test is no longer relevant

---

## Rollback Procedure

If critical issues occur:

### Option 1: Revert Code
```bash
git log --oneline  # Find commit to revert
git revert <commit-hash>
git push origin main
# GitHub Actions will test and deploy automatically
```

### Option 2: Disable Feature
```javascript
// In feature_flags collection (Firestore)
{
  FEATURE_NAME: false  // Disable problematic feature
}
```

### Option 3: Emergency Maintenance Mode
```javascript
// In system_status collection (Firestore)
{
  status: 'maintenance',
  message: 'Temporary maintenance. Back online soon.',
  estimatedReturnTime: Date.now() + 3600000  // 1 hour
}
```

### Option 4: Full Rollback
```bash
# Revert to previous stable version
git checkout <previous-tag>
git push origin main --force
# Deploy previous version
```

---

## Sign-Off & Documentation

### Before Launch Sign-Off

- [ ] All tests passing consistently
- [ ] Performance metrics reviewed and approved
- [ ] Security audit completed
- [ ] Backup procedures tested
- [ ] Recovery procedures tested
- [ ] Team trained on support procedures
- [ ] Documentation complete and reviewed
- [ ] Product owner approval obtained

### Launch Day Sign-Off

- [ ] All stakeholders notified
- [ ] Support team on standby
- [ ] Monitoring systems active
- [ ] Incident response plan activated
- [ ] Communication channels ready
- [ ] Deployment initiated
- [ ] Post-deployment checks completed

### Go-Live Decision

**✅ GO:** All checks passed, metrics normal, no critical issues
**⏸️ HOLD:** Minor issues found, can be addressed post-launch
**🛑 STOP:** Critical issues found, rollback and fix

---

## Success Criteria

✅ **Project is considered "successfully launched" when:**

1. **Functionality**
   - All core features working as designed
   - No critical bugs reported
   - All user flows completing successfully

2. **Performance**
   - Page load time < 2.5 seconds
   - API response time < 200ms
   - 99% uptime achieved

3. **Quality**
   - Test coverage > 70%
   - All automated tests passing
   - Error rate < 1%

4. **Security**
   - No security vulnerabilities identified
   - All data encrypted in transit and at rest
   - Access controls properly configured

5. **Monitoring**
   - Error tracking active
   - Performance monitoring active
   - User analytics tracking
   - Alerts responding to issues

---

## Troubleshooting During Deployment

| Issue | Cause | Solution |
|-------|-------|----------|
| Build fails | Missing dependencies | Run `npm install` and verify |
| Tests timeout | Server too slow | Increase timeout in playwright.config.ts |
| Firebase errors | Credentials invalid | Verify GitHub secrets are correct |
| Payment errors | Cashfree config wrong | Check Cashfree dashboard for correct credentials |
| CORS errors | Frontend/backend mismatch | Verify API URL configuration |
| 404 errors | Routes not registered | Check routing configuration |
| Email not sending | Email service config | Verify Brevo/email service credentials |

---

## Contact Information

**Technical Support:**
- Development Team: [email]
- DevOps Team: [email]
- Product Owner: [email]

**Escalation Contacts:**
- P0 (Critical): [emergency contact]
- P1 (High): [manager contact]
- P2 (Medium): [team contact]

---

## Appendix: Quick Commands

```bash
# Local Testing
npm run emulators &           # Terminal 1: Start Firebase
npm run dev -- -p 5000 &     # Terminal 2: Start server
npm run test:e2e              # Terminal 3: Run tests

# CI/CD Monitoring
git push origin main           # Trigger automatic tests
# Watch GitHub Actions → CI/CD Pipeline

# Deployment
npm run build                  # Build application
firebase deploy                # Deploy to Firebase
# Or push to Vercel (automatic on main)

# Debugging
DEBUG=pw:api npm run test:e2e
npx playwright show-report
CI=true npm run test:e2e
```

---

**Last Updated:** February 18, 2026
**Next Review:** March 25, 2026

