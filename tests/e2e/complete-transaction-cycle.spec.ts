import * as fs from 'fs';
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, TEST_CREDENTIALS, getDateString, getDateTimeString, generateUniqueJobTitle, JOB_STATUSES, TIMEOUTS } from '../fixtures/test-data';

/**
 * E2E Test: Complete Transaction Cycle
 * Tests the full workflow: Post â†’ Bid â†’ Award â†’ Pay â†’ Complete â†’ Release
 */


test.describe('Complete Transaction Cycle E2E', () => {
    let jobId: string;
    let uniqueJobTitle = generateUniqueJobTitle();
    // console logs moved to individual pages

    test('Complete Transaction Cycle: Full 8-Phase Flow', async ({ browser }) => {
        // Increase timeout for this specific heavy test
        test.slow();

        (uniqueJobTitle as any) = `${TEST_JOB_DATA.title} - ${Date.now()}`;

        // --- INITIAL SETUP: SINGLE CONTEXT ---
        const context = await browser.newContext();
        const page = await context.newPage();

        // Console logging for debugging session issues
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('DEBUG') || text.includes('Header State') || text.includes('Job Rendering')) {
                console.log(`BROWSER: ${msg.type()}: ${text}`);
            }
            if (text.includes('Creating new job with ID:')) {
                const capturedId = text.split('ID: ')[1]?.trim();
                if (capturedId) {
                    jobId = capturedId;
                    console.log(`TEST: Captured Job ID: ${jobId}`);
                }
            }
        });

        const helper = new TestHelper(page);

        // --- PHASE 1: JOB GIVER POSTS JOB ---
        console.log('--- START: Phase 1 - Job Giver posts a new job ---');
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Hiring Mode')).toBeVisible({ timeout: TIMEOUTS.medium });

        // Mock Pincode API
        await page.route('**/api.postalpincode.in/pincode/**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    Status: 'Success',
                    Message: 'Number of pincode(s) found:2',
                    PostOffice: [
                        { Name: 'Test PO 1', District: 'Bangalore', State: 'Karnataka', Country: 'India' },
                        { Name: 'Test PO 2', District: 'Bangalore', State: 'Karnataka', Country: 'India' }
                    ]
                }])
            });
        });

        await helper.nav.goToPostJob();
        await expect(page).toHaveURL(/\/post-job/);

        const categorySelect = page.getByTestId('job-category-select');
        await categorySelect.waitFor({ state: 'visible' });
        await categorySelect.click();

        // Wait for the option to appear in the portal
        const option = page.locator('[role="option"]').filter({ hasText: TEST_JOB_DATA.category }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        await page.fill('input[name="jobTitle"]', uniqueJobTitle);
        await page.locator('textarea[name="jobDescription"]').fill(TEST_JOB_DATA.description);
        await page.fill('input[name="skills"]', TEST_JOB_DATA.skills);

        await page.fill('input[placeholder*="110001"]', TEST_JOB_DATA.pincode);
        await page.waitForTimeout(2000);

        const poTrigger = page.locator('button:has-text("Select Post Office")');
        if (await poTrigger.textContent().then(t => t?.includes('Select Post Office'))) {
            await poTrigger.click();
            await page.locator('[role="option"]').first().click();
        }

        await page.fill('input[name="address.house"]', TEST_JOB_DATA.house);
        await page.fill('input[name="address.street"]', TEST_JOB_DATA.street);
        await page.fill('input[name="address.landmark"]', TEST_JOB_DATA.landmark);
        await page.fill('input[name="address.fullAddress"]', `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street}`);

        await page.fill('input[name="deadline"]', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(10));
        await page.fill('input[name="priceEstimate.min"]', TEST_JOB_DATA.minBudget.toString());
        await page.fill('input[name="priceEstimate.max"]', TEST_JOB_DATA.maxBudget.toString());

        await page.getByRole('button', { name: "Post Job" }).click();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`[PASS] Phase 1 Complete: Job ID ${jobId}`);

        // --- PHASE 2: INSTALLER PLACES BID ---
        console.log('--- START: Phase 2 - Installer places a bid ---');
        await helper.auth.loginAsInstaller();
        await expect(page.getByText('Work Mode')).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await expect(page.getByTestId('job-title')).toHaveText(uniqueJobTitle);
        const bidBtn = page.getByTestId('place-bid-button');
        await bidBtn.click();

        await page.locator('input[name="bidAmount"]').fill(TEST_JOB_DATA.bidAmount.toString());
        await page.fill('textarea[name="coverLetter"]', TEST_JOB_DATA.coverLetter);
        await page.getByRole('button', { name: /Submit Bid/i }).click();

        await helper.form.waitForToast('Bid Placed!');
        console.log('[PASS] Phase 2 Complete: Bid placed');

        // --- PHASE 3: JOB GIVER AWARDS JOB ---
        console.log('--- START: Phase 3 - Job Giver awards job ---');
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Hiring Mode')).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('send-offer-button').click();
        await helper.form.waitForToast('Offer Sent');
        console.log('[PASS] Phase 3 Complete: Offer sent');

        // --- PHASE 4: INSTALLER ACCEPTS JOB ---
        console.log('--- START: Phase 4 - Installer accepts job ---');
        await helper.auth.loginAsInstaller();
        await expect(page.getByText('Work Mode')).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('accept-job-button').click();
        await helper.form.waitForToast('Job Accepted!');
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[PASS] Phase 4 Complete: Job accepted');

        // --- PHASE 5: JOB GIVER FUNDS ESCROW ---
        console.log('--- START: Phase 5 - Job Giver funds escrow ---');
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Hiring Mode')).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('proceed-payment-button').click();
        await page.getByTestId('e2e-direct-fund').click({ force: true });
        await helper.form.waitForToast('Test Mode: Payment Initiated');

        await page.waitForTimeout(3000);
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');

        const startOtp = await page.locator('p.font-mono.text-3xl').innerText();
        console.log(`[PASS] Phase 5 Complete: Funded, OTP: ${startOtp}`);

        // --- PHASE 6: INSTALLER STARTS WORK ---
        console.log('--- START: Phase 6 - Installer starts work ---');
        await helper.auth.loginAsInstaller();
        await expect(page.getByText('Work Mode')).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.locator('input[placeholder="Enter Code"]').fill(startOtp);
        await page.getByRole('button', { name: 'Start' }).click();
        await helper.form.waitForToast('Work Started');
        console.log('[PASS] Phase 6 Complete: Work started');

        // --- PHASE 7: INSTALLER COMPLETES WORK ---
        console.log('--- START: Phase 7 - Installer completes work ---');
        await page.locator('input[type="file"]').setInputFiles({
            name: 'proof.png',
            mimeType: 'image/png',
            buffer: Buffer.from('test')
        });
        await page.getByTestId('submit-for-review-button').click();
        await helper.form.waitForToast('Submitted for Confirmation');
        await helper.job.waitForJobStatus('Pending Confirmation');
        console.log('[PASS] Phase 7 Complete: Work submitted');

        // --- PHASE 8: JOB GIVER APPROVES & PAYS ---
        console.log('--- START: Phase 8 - Job Giver approves work ---');
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Hiring Mode')).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('approve-work-button').click();
        await helper.form.waitForToast('Job Approved & Payment Released!');
        await helper.job.waitForJobStatus('Completed');
        console.log('[PASS] Phase 8 Complete: Job Completed');

        await context.close();
    });
});
