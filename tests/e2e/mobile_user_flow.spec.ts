// tests/e2e/mobile_user_flow.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, generateUniqueJobTitle, getDateString, getDateTimeString, TEST_ACCOUNTS } from '../fixtures/test-data';

// Emulate iPhone 13
const device = { name: 'iPhone 13', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1' };

test.describe('Mobile User Flow (Client / Professional / Admin / Staff) @slow', () => {
  test.use({ ...device });

  test('Full end-to-end flow on mobile', async ({ page }) => {
    const helper = new TestHelper(page);

    // Capture browser console logs
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Form validation errors')) {
        console.log(`[MOBILE BROWSER ERROR] ${msg.text()}`);
      } else {
        console.log(`[MOBILE BROWSER LOG] ${msg.text()}`);
      }
    });

    await helper.acceptCookies();
    const uniqueJobTitle = generateUniqueJobTitle();
    let jobId: string;

    // ---------- Login as Client ----------
    await helper.auth.loginAsClient();
    // Resilient dashboard check
    await expect(page.getByTestId('dashboard-post-job-btn').or(page.getByText(/Post New Job|Active Jobs/i)).first()).toBeVisible({ timeout: 60000 });

    // ---------- Post a Job ----------
    await helper.nav.goToPostJob();

    await helper.form.completeWizard(
      TEST_JOB_DATA.category,
      TEST_JOB_DATA.subType,
      TEST_JOB_DATA.branchAnswers,
      TEST_JOB_DATA.urgency
    );

    // Synchronize with global draft handler
    await helper.form.waitForDraftDialogHandled();

    // Fill non-wizard fields on the review/final page (on mobile, layout is single column)
    await helper.form.fillInput('Job Title', uniqueJobTitle);
    await helper.form.fillTextarea('Job Description', TEST_JOB_DATA.description);
    await helper.form.fillInput('Skills', TEST_JOB_DATA.skills);

    await helper.form.fillPincodeAndSelectPO(TEST_JOB_DATA.pincode);
    await page.fill('input[name="address.house"]', TEST_JOB_DATA.house);
    await page.fill('input[name="address.street"]', TEST_JOB_DATA.street);
    await page.fill('input[name="address.landmark"]', TEST_JOB_DATA.landmark);
    await page.fill('input[name="address.fullAddress"]', `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street}`);

    await page.fill('input[name="deadline"]', getDateString(7));
    await page.fill('input[name="jobStartDate"]', getDateTimeString(10));
    await page.fill('[data-testid="min-budget-input"]', TEST_JOB_DATA.minBudget.toString());
    await page.fill('[data-testid="max-budget-input"]', TEST_JOB_DATA.maxBudget.toString());

    // Use the robust helper to handle checkbox, clicking Post Job, and the confirmation dialog
    await helper.form.submitPostJob();

    // Wait for job page to load (status shows as 'open' in UI)
    console.log('[Mobile] Checking for job detail page...');
    await page.waitForSelector(`[data-testid="job-detail-page"]`, { timeout: 10000 }).catch(() => {
      console.log('[Mobile] Job detail page selector not found, continuing anyway');
    });
    jobId = await helper.job.getJobIdFromUrl();
    console.log(`Job Posted: ${jobId}`);

    if (!jobId) {
      throw new Error('[MOBILE E2E] Job ID could not be captured. Job posting likely failed.');
    }

    // ---------- Switch to Professional logic ----------
    await helper.auth.logout();
    await helper.auth.loginAsProfessional();

    // Direct navigation to job (more robust than browsing)
    await page.goto(`/dashboard/jobs/${jobId}`);

    // Resilient wait for Place Bid button
    await page.getByTestId('job-title').waitFor({ state: 'visible', timeout: 30000 }).catch(() => { });
    await expect(page.getByTestId('job-title')).toContainText(/CCTV|Security|Test CCTV/i);

    const placeBidButton = page.getByRole('button', { name: /Place Bid/i }).first().or(page.getByTestId('place-bid-button').first());
    await placeBidButton.waitFor({ state: 'visible', timeout: 30000 });

    // Dismiss any toasts if they overlap
    await page.locator('[role="status"]').evaluateAll(nodes => nodes.forEach(n => (n as HTMLElement).style.display = 'none')).catch(() => { });

    // Scroll and click
    await placeBidButton.scrollIntoViewIfNeeded();
    await placeBidButton.click();

    // Use named role to avoid strict mode violation from Next.js error overlay dialog
    const bidDialog = page.locator('div[role="dialog"]').filter({ has: page.locator('input[name="amount"]') });
    await bidDialog.waitFor({ state: 'visible' });
    await bidDialog.locator('input[name="amount"]').click({ clickCount: 3 });
    await bidDialog.locator('input[name="amount"]').type(TEST_JOB_DATA.bidAmount.toString(), { delay: 30 });
    await bidDialog.locator('textarea[name="coverLetter"]').fill(TEST_JOB_DATA.coverLetter);

    // Ensure previous toasts are gone so they don't obstruct the button
    const toast = page.locator('[role="status"]');
    if (await toast.isVisible()) {
      await toast.click().catch(() => { }); // Dismiss if clickable
      await toast.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
    }

    // Submit the bid
    const bidBtn = bidDialog.getByTestId('submit-bid-button');
    await expect(bidBtn).toBeVisible();
    await bidBtn.scrollIntoViewIfNeeded();
    await bidBtn.click({ force: true });

    await helper.form.waitForToast('Bid Placed!');

    // ---------- Client Awards ----------
    await helper.auth.logout();
    await helper.auth.loginAsClient();
    await page.goto(`/dashboard/jobs/${jobId}`);

    // Wait for send-offer-button directly (bid-card-wrapper testid does not exist in source)
    for (let attempt = 0; attempt < 4; attempt++) {
        const ok = await page.getByTestId('send-offer-button').first().isVisible({ timeout: 20000 }).catch(() => false);
        if (ok) break;
        console.log(`[Mobile] Offer button not visible (attempt ${attempt + 1}/4), reloading...`);
        await page.reload();
        await page.waitForTimeout(3000);
    }
    await page.getByTestId('send-offer-button').first().waitFor({ state: 'visible', timeout: 60000 });

    await page.getByTestId('send-offer-button').first().click();
    await helper.job.handleAuthorizationModal();
    // Toast is "MISSION AUTHORIZED"; fallback: wait for status change in DOM
    await Promise.race([
      helper.form.waitForToast('MISSION AUTHORIZED'),
      page.locator('[data-status="bid_accepted"]').waitFor({ state: 'visible', timeout: 20000 }),
      page.getByText('Retract Authorization').waitFor({ state: 'visible', timeout: 20000 })
    ]).catch(() => console.log('[WARN] award confirmation signal not detected, continuing...'));
    await page.waitForTimeout(1500);

    // ---------- Professional Accepts ----------
    // Ensure Professional has Payouts Setup
    await page.request.post('/api/e2e/setup-Professional', {
      data: { email: TEST_ACCOUNTS.professional.email }
    });
    console.log('[INFO] Seeded Professional payouts via API');

    await helper.auth.logout();
    await helper.auth.loginAsProfessional();
    await page.goto(`/dashboard/jobs/${jobId}`);
    await page.getByTestId('accept-job-button').first().click();

    // Wait for React state to settle after button click
    await page.waitForTimeout(1500);

    // Verify conflict dialog appears - check multiple times to handle async rendering
    const conflictDialog = page.getByText('Schedule Conflict Warning');
    console.log("Waiting for conflict dialog...");
    let dialogVisible = false;

    // Try multiple times with short waits to catch the dialog as it appears
    for (let i = 0; i < 3; i++) {
      dialogVisible = await conflictDialog.isVisible({ timeout: 5000 }).catch(() => false);
      if (dialogVisible) break;
      await page.waitForTimeout(1000);
    }

    if (dialogVisible) {
      console.log("Conflict dialog visible!");
      const btn = page.getByRole('button', { name: "I Understand, Proceed & Accept" });
      await btn.click();
      console.log("Clicked Proceed button.");
      await expect(conflictDialog).not.toBeVisible({ timeout: 10000 });
      console.log("Dialog closed.");
    } else {
      console.log("Info: Conflict dialog NOT visible (No conflict detected).");
    }

    // Wait for acceptance to complete - backend processing
    await page.waitForTimeout(3000);

    // Conflict resolution involves backend batch writes, can be slow
    // Wait for UI to update instead of relying on toast
    await expect(page.getByText('Pending Funding')).toBeVisible({ timeout: 30000 });

    // ---------- Admin / Support Access Check ----------
    await helper.auth.logout();
    await page.goto('/login'); // Force clean start
    await helper.auth.loginAsAdmin();
    // Admin dashboard shows stats cards, check for one of them
    await expect(page.locator('text=Total Users').first()).toBeVisible({ timeout: 20000 });

    console.log('Mobile Flow Completed Successfully');
  });
});



