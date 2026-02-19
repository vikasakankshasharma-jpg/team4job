# GitHub Secrets Configuration Guide

## Overview
This guide walks you through setting up GitHub Actions secrets required for the Playwright E2E test suite and CI/CD pipeline to run successfully.

---

## Prerequisites
- Repository admin/owner access on GitHub
- Firebase project credentials (dodo-beta or your project)
- API keys for third-party services (Cashfree, Gemini AI, Google Maps)

---

## Setting Up Secrets in GitHub

### Step 1: Navigate to Repository Settings
1. Go to your GitHub repository
2. Click **Settings**
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Step 2: Add Required Secrets

Add each secret by clicking "New repository secret" and entering the Name and Value.

#### **Firebase Credentials** (Required)

| Secret Name | Value | Source |
|-------------|-------|--------|
| `FIREBASE_PROJECT_ID` | `dodo-beta` | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@dodo-beta.iam.gserviceaccount.com` | Firebase Console → Service Account |
| `FIREBASE_PRIVATE_KEY` | (Multi-line private key) | Firebase Console → Service Account → Download JSON |

**How to get FIREBASE_PRIVATE_KEY:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (dodo-beta)
3. Click ⚙️ (Settings) → Project Settings
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Copy the entire private key value (starts with `-----BEGIN PRIVATE KEY-----`)
7. Paste as secret value (GitHub will handle multiline)

#### **API Keys** (Required for Tests to Pass)

| Secret Name | Value | Source |
|-------------|-------|--------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps API key | [Google Cloud Console](https://console.cloud.google.com) |
| `CASHFREE_PAYMENTS_CLIENT_ID` | Test/Prod ID | Cashfree Dashboard → Settings |
| `CASHFREE_PAYMENTS_CLIENT_SECRET` | Test/Prod Secret | Cashfree Dashboard → Settings |
| `GEMINI_API_KEY` | Your Gemini API key | [Google AI Studio](https://aistudio.google.com) |
| `GOOGLE_GENAI_API_KEY` | Same as GEMINI_API_KEY | (Can be same value) |
| `GOOGLE_API_KEY` | Your Google API Key | [Google Cloud Console](https://console.cloud.google.com) |

#### **Optional Secrets**

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `BREVO_API_KEY` | Brevo email API key | Email notifications (optional) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project DSN | Error tracking (optional) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token | Sentry integration (optional) |

---

## Step 3: Verification

After adding all secrets:

1. Go to **Settings → Secrets and variables → Actions**
2. You should see all secrets listed (values are hidden)
3. ✅ Example of complete setup:
   ```
   FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL
   FIREBASE_PRIVATE_KEY
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   CASHFREE_PAYMENTS_CLIENT_ID
   CASHFREE_PAYMENTS_CLIENT_SECRET
   GEMINI_API_KEY
   GOOGLE_GENAI_API_KEY
   GOOGLE_API_KEY
   ```

---

## Step 4: Test the Setup

Once secrets are configured, test the CI/CD pipeline:

### Option A: Push to Trigger Automatically
```bash
git add .
git commit -m "Setup: Configure GitHub Actions"
git push origin main
```

### Option B: Manually Trigger Workflow
1. Go to **Actions** tab
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

### Monitor Execution
1. Go to **Actions**
2. Click the running workflow
3. Watch the job progress:
   - ✅ Lint & Type Check
   - ✅ Build
   - ✅ Smoke Tests
   - ✅ E2E Tests (3 shards)
   - ✅ Edge Case Tests

---

## Troubleshooting

### "Secret not found" Error
**Problem:** Workflow fails with "secret not found"
**Solution:** 
- Verify secret name matches exactly in `.github/workflows/ci-cd.yml`
- Secrets are case-sensitive
- Wait 60 seconds after adding secret before running workflow

### "Firebase: Error (auth/invalid-api-key)"
**Problem:** Tests fail with invalid Firebase API key
**Solution:**
- Verify `FIREBASE_PRIVATE_KEY` is correctly copied (no truncation)
- Ensure no extra quotes or whitespace
- For multiline keys, GitHub handles newlines automatically

### "Payment Service Failed"
**Problem:** Tests fail at payment step
**Solution:**
- Verify `CASHFREE_PAYMENTS_CLIENT_ID` and `CASHFREE_PAYMENTS_CLIENT_SECRET` are correct
- Check if using TEST or PROD credentials (should use TEST for CI)
- Verify credentials haven't expired

### Workflow Timeout
**Problem:** Tests timeout at 45 minutes
**Solution:**
- This is expected - 119 tests × 3 shards can take time
- Check if specific test is hanging
- Review test logs for failures
- Consider reducing test set or increasing timeout

---

## Security Best Practices

⚠️ **IMPORTANT:**
- ✅ Never commit secrets to Git
- ✅ Rotate secrets periodically
- ✅ Use dedicated service account for CI/CD
- ✅ Restrict secret access to necessary workflows
- ✅ Audit secret usage regularly
- ❌ Never paste secrets in PR descriptions or comments
- ❌ Don't share secrets via Slack/Teams

---

## Next Steps

After secrets are configured:

1. **Run First Workflow:** Trigger CI/CD pipeline to verify setup
2. **Review Test Results:** Check GitHub Actions artifacts
3. **Fix Failures:** Address any test failures
4. **Setup Notifications:** Configure slack/email alerts (optional)
5. **Document Credentials Refresh:** Schedule periodic secret rotation

---

## Reference Links

- **GitHub Secrets Docs:** https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Firebase Service Accounts:** https://firebase.google.com/docs/admin/setup
- **Cashfree API Docs:** https://docs.cashfree.com
- **Google Maps API:** https://developers.google.com/maps
- **Gemini AI:** https://ai.google.dev

---

## Support

For issues:
1. Check GitHub Actions workflow logs
2. Review secret names vs. workflow references
3. Verify API key permissions and scope
4. Contact the development team

