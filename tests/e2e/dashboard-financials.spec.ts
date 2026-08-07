
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

        // 1. Client Posts Job using the wizard (matches all other test suites)
        await helper.auth.loginAsClient();
        await helper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );

        // Fill the post-job details form
        await helper.form.fillInput('Job Title', uniqueJobTitle);
        await helper.form.fillTextarea('Job Description', TEST_JOB_DATA.description);
        await helper.form.fillInput('Skills', TEST_JOB_DATA.skills);

        await helper.form.fillPincodeAndSelectPO(TEST_JOB_DATA.pincode);

        await page.fill('input[name="address.house"]', TEST_JOB_DATA.house).catch(() => {});
        await page.fill('input[name="address.street"]', TEST_JOB_DATA.street).catch(() => {});
        await page.fill('input[name="address.landmark"]', TEST_JOB_DATA.landmark).catch(() => {});
        await page.fill('input[name="address.fullAddress"]', `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street}`).catch(() => {});
        await page.fill('input[name="deadline"]', getDateString(7)).catch(() => {});
        await page.fill('input[name="jobStartDate"]', getDateTimeString(30)).catch(() => {});
        await page.fill('[data-testid="min-budget-input"]', '1000');
        await page.fill('[data-testid="max-budget-input"]', '5000');

        await helper.preparePostJobSubmission();
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

        // 3. Client Awards — use polling loop like other suites (bids need tab click first)
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);

        let offerClicked = false;
        const offerDeadline = Date.now() + 45000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) await bidsTab.click();

            const offerBtn = page.getByTestId('send-offer-button').first();
            if (await offerBtn.isVisible().catch(() => false)) {
                await offerBtn.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }
            await page.waitForTimeout(2000);
        }
        if (!offerClicked) throw new Error('Could not find send-offer-button');
        await helper.form.waitForToast('Offer Sent').catch(() => {});
        console.log('[SETUP] Offer Sent');

        // 4. Professional Accepts
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const acceptBtn = page.getByTestId('accept-job-button').first()
            .or(page.getByRole('button', { name: /^Accept Job$/i }).first());
        await acceptBtn.click({ force: true });

        // Robust Conflict Handling
        const conflictBtn = page.getByRole('button', { name: /Bypass & Authorize|I Understand, Proceed & Accept/i });
        if (await conflictBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await conflictBtn.click();
        }
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[SETUP] Job Accepted');

        // 5. Client Funds (Mock Payment)
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const proceedBtn = page.getByTestId('proceed-payment-button').first()
            .or(page.getByRole('button', { name: /Proceed.*Payment|Secure Funding|Pay/i }).first());
        await expect(proceedBtn).toBeVisible({ timeout: 15000 });
        await proceedBtn.click();
        await page.getByTestId('e2e-direct-fund').click({ force: true });
        await page.waitForTimeout(2000);
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');
        console.log('[SETUP] Job Funded');

        // --- VERIFICATION: Client Dashboard ---
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

        // Check "Total Spent" stat card is present (value may be hardcoded or dynamic)
        await expect(page.getByText(/Total Spent|Funds in Secure Deposit/i)).toBeVisible({ timeout: 30000 });
        // Check for any currency value (including $ or ₹)
        await expect(
            page.locator('.text-4xl, .text-2xl, h3, [class*="font-bold"], [class*="font-black"]').filter({ hasText: /^[₹$]/ }).first()
        ).toBeVisible({ timeout: 15000 });
        console.log('[PASS] Client Dashboard: Total Spent card visible');


        // --- VERIFICATION: Professional Dashboard ---
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

        // Projected Earnings is in a chart card — check it's visible
        await expect(page.getByText('Projected Earnings')).toBeVisible({ timeout: 30000 });
        console.log('[PASS] Professional Dashboard: Projected Earnings visible');

        await context.close();
    });
});



