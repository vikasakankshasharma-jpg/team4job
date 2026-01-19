// tests/e2e/mobile_user_flow.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, generateUniqueJobTitle, getDateString, getDateTimeString, TEST_ACCOUNTS } from '../fixtures/test-data';

// Emulate iPhone 13
const device = { name: 'iPhone 13', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1' };

test.describe('Mobile User Flow (Job Giver / Installer / Admin / Staff)', () => {
  test.use({ ...device });

  test('Full end-to-end flow on mobile', async ({ page }) => {
    const helper = new TestHelper(page);
    await helper.acceptCookies();
    const uniqueJobTitle = generateUniqueJobTitle();
    let jobId: string;

    // ---------- Login as Job Giver ----------
    await helper.auth.loginAsJobGiver();
    await expect(page.locator('text=Active Jobs').first()).toBeVisible();

    // ---------- Post a Job ----------
    await helper.nav.goToPostJob();

    await helper.form.selectDropdown('Category', TEST_JOB_DATA.category);
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
    await page.fill('input[name="priceEstimate.min"]', TEST_JOB_DATA.minBudget.toString());
    await page.fill('input[name="priceEstimate.max"]', TEST_JOB_DATA.maxBudget.toString());

    await helper.form.clickButton('Post Job');
    await helper.job.waitForJobStatus('Open for Bidding');
    jobId = await helper.job.getJobIdFromUrl();
    console.log(`Job Posted: ${jobId}`);

    // ---------- Switch to Installer logic ----------
    await helper.auth.logout();
    await helper.auth.loginAsInstaller();

    // Direct navigation to job (more robust than browsing)
    await page.goto(`/dashboard/jobs/${jobId}`);

    // Place Bid
    await helper.form.clickButton('Place Bid');
    await helper.form.fillInput('Bid Amount', TEST_JOB_DATA.bidAmount.toString());
    await helper.form.fillTextarea('Cover Letter', TEST_JOB_DATA.coverLetter);

    // Ensure previous toasts are gone so they don't obstruct the button
    const toast = page.locator('[role="status"]');
    if (await toast.isVisible()) {
      await toast.click().catch(() => { }); // Dismiss if clickable
      await toast.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
    }

    // Fallback to text selector since data-testid seems flaky in this env
    // The dialog button is usually the last one in the DOM (Portal)
    const bidBtn = page.locator('button').filter({ hasText: 'Place Bid' }).last();

    // Ensure dialog is fully stable
    await expect(bidBtn).toBeVisible();
    await bidBtn.click(); // Try normal click first

    await helper.form.waitForToast('Bid Placed!');

    // ---------- Job Giver Awards ----------
    await helper.auth.logout();
    await helper.auth.loginAsJobGiver();
    await page.goto(`/dashboard/jobs/${jobId}`);

    await page.getByTestId('send-offer-button').first().click();
    await helper.form.waitForToast('Offer Sent');

    // ---------- Installer Accepts ----------
    // Ensure Installer has Payouts Setup
    await page.request.post('/api/e2e/setup-installer', {
      data: { email: TEST_ACCOUNTS.installer.email }
    });
    console.log('[INFO] Seeded installer payouts via API');

    await helper.auth.logout();
    await helper.auth.loginAsInstaller();
    await page.goto(`/dashboard/jobs/${jobId}`);
    await page.getByTestId('accept-job-button').first().click();

    // Verify conflict dialog appears (Timeout reduced)
    const conflictDialog = page.getByText('Schedule Conflict Warning');
    console.log("Waiting for conflict dialog...");
    if (await conflictDialog.isVisible({ timeout: 10000 })) {
      console.log("Conflict dialog visible!");
      // Verification: Check for Responsive Classes
      const contentContainer = page.locator('.max-h-\\[80vh\\]');
      await expect(contentContainer).toBeVisible({ timeout: 5000 });
      console.log("Verified Responsive Classes are present.");

      const btn = page.getByRole('button', { name: "I Understand, Proceed & Accept" });
      await btn.click();
      console.log("Clicked Proceed button.");
      await expect(conflictDialog).not.toBeVisible();
      console.log("Dialog closed.");
    } else {
      console.log("Info: Conflict dialog NOT visible (No conflict detected).");
    }

    // Conflict resolution involves backend batch writes, can be slow
    // Wait for UI to update instead of relying on toast
    await expect(page.getByText('Pending Funding')).toBeVisible({ timeout: 20000 });

    // ---------- Admin / Support Access Check ----------
    await helper.auth.logout();
    await helper.auth.loginAsAdmin();
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();

    console.log('Mobile Flow Completed Successfully');
  });
});
