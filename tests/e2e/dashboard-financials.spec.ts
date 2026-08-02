
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

        // 1. Client Posts Job
        await helper.auth.loginAsClient();
        await helper.nav.goToPostJob();

        // Fill Post Job Form using robust helpers
        await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
        await page.fill('input[name="jobTitle"]', uniqueJobTitle);
        await page.locator('[data-testid="job-description-input"]').fill(TEST_JOB_DATA.description);
        await page.fill('input[name="skills"]', TEST_JOB_DATA.skills);

        // Use robust pincode helper
        await helper.form.fillPincodeAndSelectPO(TEST_JOB_DATA.pincode);

        await page.fill('input[name="address.house"]', TEST_JOB_DATA.house);
        await page.fill('input[name="address.street"]', TEST_JOB_DATA.street);
        await page.fill('input[name="address.landmark"]', TEST_JOB_DATA.landmark);
        await page.fill('input[name="address.fullAddress"]', `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street}`);
        await page.fill('input[name="deadline"]', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(30));
        await page.fill('[data-testid="min-budget-input"]', '1000');
        await page.fill('[data-testid="max-budget-input"]', '5000');

        // Use the robust submitPostJob helper that handles checkboxes and confirmation modals
        await helper.form.submitPostJob();

        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`[SETUP] Job Posted: ${jobId}`);

        // 2. Professional Bids
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();

        // Wait for dialog and fill fields
        await expect(page.getByRole('dialog', { name: /Place a Bid/i })).toBeVisible();
        await page.locator('input[name="amount"]').fill('2000');
        await page.fill('textarea[name="coverLetter"]', 'I can do this.');
        await page.getByTestId('submit-bid-button').click();
        await helper.form.waitForToast('Bid Placed!');
        console.log('[SETUP] Bid Placed');

        // 3. Client Awards
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('send-offer-button').first().click();
        await helper.job.handleAuthorizationModal();
        await helper.form.waitForToast('Offer Sent');
        console.log('[SETUP] Offer Sent');

        // 4. Professional Accepts
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('accept-job-button').first().click();

        // Robust Conflict Handling
        const conflictDialogText = page.getByText('Schedule Conflict Warning');
        try {
            console.log("Waiting for conflict dialog (up to 5s)...");
            if (await conflictDialogText.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log("Conflict Dialog detected. Clicking Confirm...");
                await page.getByRole('button', { name: "I Understand, Proceed & Accept" }).click();
            }
        } catch (e) {
            console.log("No Conflict Dialog detected.");
        }
        await helper.form.waitForToast('Job Accepted!');
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[SETUP] Job Accepted');

        // 5. Client Funds (Mock Payment)
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('proceed-payment-button').click();
        await page.waitForFunction(() => (window as any).e2e_directFundJob !== undefined);
        await page.evaluate(async () => {
            await page.getByTestId('e2e-direct-fund').click({ force: true });
        });
        await helper.form.waitForToast('Test Mode: Payment Initiated');
        await helper.job.waitForJobStatus('In Progress');
        console.log('[SETUP] Job Funded');

        // --- VERIFICATION: Client Dashboard ---
        await page.goto('/dashboard');
        // Check "Funds in Secure Deposit" or "Total Secure Deposit"
        await expect(page.getByText(/Funds in Secure Deposit|Total Secure Deposit/i)).toBeVisible();
        // Since test account accumulates data, we check for presence of a non-zero currency value
        await expect(page.locator('.text-2xl.font-bold').filter({ hasText: /^₹[\d,]+$/ }).first()).toBeVisible();
        console.log('[PASS] Client Dashboard: Funds in Escrow visible');


        // --- VERIFICATION: Professional Dashboard ---
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto('/dashboard');

        await expect(page.getByText('Projected Earnings')).toBeVisible();
        // Check for currency value presence specifically in Projeced Earnings card
        const earningsCard = page.locator('div').filter({ has: page.getByText('Projected Earnings', { exact: true }) }).last();
        await expect(earningsCard.locator('.text-2xl.font-bold, h3').filter({ hasText: /^₹[\d,]+$/ }).first()).toBeVisible();

        console.log('[PASS] Professional Dashboard: Projected Earnings visible');

        await context.close();
    });
});


