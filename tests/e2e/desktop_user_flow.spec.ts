// tests/e2e/desktop_user_flow.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, generateUniqueJobTitle, getDateString, getDateTimeString } from '../fixtures/test-data';

test.describe('Desktop User Flow (Job Giver / Installer / Admin / Staff)', () => {

    test('Full end-to-end flow on desktop', async ({ page }) => {
        const helper = new TestHelper(page);
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

        // Direct navigation to job
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Place Bid
        await helper.form.clickButton('Place Bid');
        await helper.form.fillInput('Bid Amount', TEST_JOB_DATA.bidAmount.toString());
        await helper.form.fillTextarea('Cover Letter', TEST_JOB_DATA.coverLetter);
        await helper.form.clickButton('Place Bid'); // Submit
        await helper.form.waitForToast('Bid Placed!');

        // ---------- Job Giver Awards ----------
        await helper.auth.logout();
        await helper.auth.loginAsJobGiver();
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('send-offer-button').first().click();
        await helper.form.waitForToast('Offer Sent');

        // ---------- Installer Accepts ----------
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('accept-job-button').first().click();

        // Handle Conflict Dialog
        const conflictDialog = page.getByText('Availability Conflict Detected');
        if (await conflictDialog.isVisible({ timeout: 5000 })) {
            await page.getByRole('button', { name: "Confirm & Auto-Decline" }).click();
        }
        await helper.form.waitForToast('Job Accepted!');

        // ---------- Admin / Support Access Check ----------
        await helper.auth.logout();
        await helper.auth.loginAsAdmin();
        await expect(page.locator('text=Admin Dashboard')).toBeVisible();

        console.log('Desktop Flow Completed Successfully');
    });
});
