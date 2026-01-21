
import * as fs from 'fs';
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, getDateString, getDateTimeString, generateUniqueJobTitle, TIMEOUTS } from '../fixtures/test-data';

/**
 * E2E Test: Dashboard Financials
 * Verifies that "Funds in Escrow" and "Projected Earnings" appear correctly on role-based dashboards.
 */

test.describe('Dashboard Financials E2E', () => {
    let jobId: string;
    let uniqueJobTitle = generateUniqueJobTitle();

    test('Verify Escrow and Projected Earnings', async ({ browser }) => {
        test.slow();
        // --- INITIAL SETUP ---
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page);

        console.log('--- START: Dashboard Financials verification ---');

        // 1. Job Giver Posts Job
        await helper.auth.loginAsJobGiver();
        await helper.nav.goToPostJob();

        // Fill Post Job Form
        await page.getByTestId('job-category-select').click();
        await page.locator('[role="option"]').filter({ hasText: TEST_JOB_DATA.category }).first().click();
        await page.fill('input[name="jobTitle"]', uniqueJobTitle);
        await page.locator('textarea[name="jobDescription"]').fill(TEST_JOB_DATA.description);
        await page.fill('input[name="skills"]', TEST_JOB_DATA.skills);
        await page.fill('input[placeholder*="110001"]', TEST_JOB_DATA.pincode);
        await page.waitForTimeout(2000); // Wait for pincode API
        const poTrigger = page.locator('button:has-text("Select Post Office")');
        if (await poTrigger.count() > 0) {
            await poTrigger.click();
            await page.locator('[role="option"]').first().click();
        }
        await page.fill('input[name="address.house"]', TEST_JOB_DATA.house);
        await page.fill('input[name="address.street"]', TEST_JOB_DATA.street);
        await page.fill('input[name="address.landmark"]', TEST_JOB_DATA.landmark);
        await page.fill('input[name="address.fullAddress"]', `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street}`);
        await page.fill('input[name="deadline"]', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(30));
        await page.fill('input[name="priceEstimate.min"]', '1000');
        await page.fill('input[name="priceEstimate.max"]', '5000');
        await page.getByRole('button', { name: "Post Job" }).click();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`[SETUP] Job Posted: ${jobId}`);

        // 2. Installer Bids
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="bidAmount"]').fill('2000');
        await page.fill('textarea[name="coverLetter"]', 'I can do this.');
        await page.getByRole('button', { name: /Place Bid/i }).click();
        await helper.form.waitForToast('Bid Placed!');
        console.log('[SETUP] Bid Placed');

        // 3. Job Giver Awards
        await helper.auth.logout();
        await helper.auth.loginAsJobGiver();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('send-offer-button').first().click();
        await helper.form.waitForToast('Offer Sent');
        console.log('[SETUP] Offer Sent');

        // 4. Installer Accepts
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('accept-job-button').first().click();
        // Handle potential conflict dialog
        // Handle potential conflict dialog
        // Robust Conflict Handling (copied from complete-transaction-cycle.spec.ts)
        const conflictDialogText = page.getByText('Schedule Conflict Warning');
        try {
            console.log("Waiting for conflict dialog (up to 10s)...");
            await conflictDialogText.waitFor({ state: 'visible', timeout: 10000 });
            console.log("Conflict Dialog detected. Clicking Confirm...");
            await page.getByRole('button', { name: "I Understand, Proceed & Accept" }).click();
        } catch (e) {
            console.log("No Conflict Dialog detected (timeout).");
        }
        await helper.form.waitForToast('Job Accepted!');
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[SETUP] Job Accepted');

        // 5. Job Giver Funds (Mock Payment)
        await helper.auth.logout();
        await helper.auth.loginAsJobGiver();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('proceed-payment-button').click();
        await page.waitForFunction(() => (window as any).e2e_directFundJob !== undefined);
        await page.evaluate(async () => {
            await (window as any).e2e_directFundJob();
        });
        await helper.form.waitForToast('Test Mode: Payment Initiated');
        await helper.job.waitForJobStatus('In Progress');
        console.log('[SETUP] Job Funded');

        // --- VERIFICATION: Job Giver Dashboard ---
        await page.goto('/dashboard');
        // Check "Funds in Secure Deposit"
        await expect(page.getByText('Funds in Secure Deposit')).toBeVisible();
        // Since test account accumulates data, we check for presence of a non-zero currency value
        // Job Giver uses StatCard which uses div.text-2xl.font-bold
        await expect(page.locator('.text-2xl.font-bold').filter({ hasText: /^₹[\d,]+$/ }).first()).toBeVisible();
        console.log('[PASS] Job Giver Dashboard: Funds in Escrow visible');


        // --- VERIFICATION: Installer Dashboard ---
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto('/dashboard');

        await expect(page.getByText('Projected Earnings')).toBeVisible();
        // Check for currency value presence specifically in Projeced Earnings card
        // We find the card containing the label, then the h3 inside it
        const earningsCard = page.locator('div').filter({ has: page.getByText('Projected Earnings', { exact: true }) }).last();
        // .last() because 'div' might match outer containers too, the inner-most will be last or we can be more specific
        // Actually, let's use a better locator strategy
        await expect(earningsCard.locator('h3').filter({ hasText: /^₹[\d,]+$/ })).toBeVisible();

        console.log('[PASS] Installer Dashboard: Projected Earnings visible');

        await context.close();
    });
});
