
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

        (uniqueJobTitle as any) = `${TEST_JOB_DATA.title} - ${Date.now()} `;

        // --- INITIAL SETUP: SINGLE CONTEXT ---
        const context = await browser.newContext();
        const page = await context.newPage();

        // Console logging for debugging session issues
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('DEBUG') || text.includes('Header State') || text.includes('Job Rendering')) {
                console.log(`BROWSER: ${msg.type()}: ${text} `);
            }
            if (text.includes('Creating new job with ID:')) {
                const capturedId = text.split('ID: ')[1]?.trim();
                if (capturedId) {
                    jobId = capturedId;
                    console.log(`TEST: Captured Job ID: ${jobId} `);
                }
            }
        });

        const helper = new TestHelper(page);

        // --- PHASE 1: JOB GIVER POSTS JOB ---
        console.log('--- START: Phase 1 - Job Giver posts a new job ---');
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Active Jobs').first()).toBeVisible({ timeout: TIMEOUTS.medium });

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
        await page.fill('input[name="address.fullAddress"]', `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street} `);

        await page.fill('input[name="deadline"]', getDateString(7));
        const randomDays = Math.floor(Math.random() * 90) + 10;
        await page.fill('input[name="jobStartDate"]', getDateTimeString(randomDays));
        await page.fill('input[name="priceEstimate.min"]', TEST_JOB_DATA.minBudget.toString());
        await page.fill('input[name="priceEstimate.max"]', TEST_JOB_DATA.maxBudget.toString());

        await page.getByRole('button', { name: "Post Job" }).click();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`[PASS] Phase 1 Complete: Job ID ${jobId} `);

        // --- PHASE 2: INSTALLER PLACES BID ---
        console.log('--- START: Phase 2 - Installer places a bid ---');
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await expect(page.getByText('Open Jobs').first()).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await expect(page.getByTestId('job-title')).toHaveText(uniqueJobTitle);
        const bidBtn = page.getByTestId('place-bid-button');
        await bidBtn.click();

        await page.locator('input[name="bidAmount"]').fill(TEST_JOB_DATA.bidAmount.toString());
        await page.fill('textarea[name="coverLetter"]', TEST_JOB_DATA.coverLetter);
        await page.getByRole('button', { name: /Place Bid/i }).click();

        await helper.form.waitForToast('Bid Placed!');
        console.log('[PASS] Phase 2 Complete: Bid placed');

        // --- PHASE 3: JOB GIVER AWARDS JOB ---
        console.log('--- START: Phase 3 - Job Giver awards job ---');
        await helper.auth.logout(); // Force logout to switch user from Installer to Job Giver
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Active Jobs').first()).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Wait for bids to load and click send offer
        await expect(page.getByTestId('bid-card-wrapper').first()).toBeVisible({ timeout: TIMEOUTS.medium });
        const offerBtn = page.getByTestId('send-offer-button').first();
        await offerBtn.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
        await offerBtn.click();
        await helper.form.waitForToast('Offer Sent');
        console.log('[PASS] Phase 3 Complete: Offer sent');

        // --- PHASE 4: INSTALLER ACCEPTS JOB ---
        console.log('--- START: Phase 4 - Installer accepts job ---');

        // Ensure Installer has Payouts Setup (via Test API)
        await page.request.post('/api/e2e/setup-installer', {
            data: { email: 'installer@example.com' }
        });
        console.log('[INFO] Seeded installer payouts via API');

        await helper.auth.logout(); // Ensure clean session
        await helper.auth.loginAsInstaller();
        await expect(page.getByText('Open Jobs').first()).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Capture conflict check completion
        const conflictCheckPromise = page.waitForEvent('console', msg => msg.text().includes('Conflict check complete'));
        await page.getByTestId('accept-job-button').first().click();

        // Wait for usage check to finish
        try {
            await conflictCheckPromise; // Wait until log appears
        } catch (e) {
            console.log('E2E: Conflict check log not found (timeout?), proceeding check...');
        }

        // Handle potential Conflict Dialog (if previous test runs left awarded jobs)
        // Use a broader locator strategy
        const conflictDialogText = page.getByText('Availability Conflict Detected');

        try {
            // Short timeout to check presence - extended to 120s because conflict check query can be VERY slow
            if (await conflictDialogText.isVisible({ timeout: 120000 })) {
                console.log('E2E: Conflict Dialog detected. Clicking Confirm...');
                await page.getByRole('button', { name: "Confirm & Auto-Decline" }).click();
            } else {
                console.log('E2E: No Conflict Dialog detected.');
            }
        } catch (e) {
            console.log('E2E: Error checking for conflict dialog (ignored):', e);
        }

        await helper.form.waitForToast('Job Accepted!');
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[PASS] Phase 4 Complete: Job accepted');

        // --- PHASE 5: JOB GIVER FUNDS ESCROW ---
        console.log('--- START: Phase 5 - Job Giver funds escrow ---');
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Active Jobs').first()).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('proceed-payment-button').click();

        // Wait for dialog to open
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

        // Bypass payment form using global shim
        await page.waitForFunction(() => (window as any).e2e_directFundJob !== undefined);
        await page.evaluate(async () => {
            console.log("Triggering e2e_directFundJob from Playwright");
            await (window as any).e2e_directFundJob();
        });
        await helper.form.waitForToast('Test Mode: Payment Initiated');
        await helper.form.waitForToast('Test Mode: Payment Initiated');

        await page.waitForTimeout(3000);
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');

        const otpLocator = page.locator('p.font-mono.text-3xl');
        await expect(otpLocator).toBeVisible({ timeout: 10000 });
        const startOtp = await otpLocator.innerText();
        console.log(`[PASS] Phase 5 Complete: Funded, OTP: ${startOtp} `);

        // --- PHASE 6: INSTALLER STARTS WORK ---
        console.log('--- START: Phase 6 - Installer starts work ---');
        await helper.auth.loginAsInstaller();
        await expect(page.getByText('Open Jobs').first()).toBeVisible({ timeout: TIMEOUTS.medium });

        console.log(`[DEBUG] Phase 6: Navigating to job detail. JobID: ${jobId}`);
        const targetUrl = `/dashboard/jobs/${jobId}`;
        console.log(`[DEBUG] Target URL: ${targetUrl}`);
        try {
            fs.appendFileSync('debug_phase6.txt', `Phase 6: JobID=${jobId}, TargetURL=${targetUrl}\n`);
        } catch (e) {
            console.error('Failed to write debug log', e);
        }
        await page.goto(targetUrl);

        await page.locator('input[placeholder="Enter Code"]').fill(startOtp);
        await page.getByRole('button', { name: 'Start' }).click();
        await helper.form.waitForToast('Work Started');
        console.log('[PASS] Phase 6 Complete: Work started');

        // --- PHASE 7: INSTALLER COMPLETES WORK ---
        console.log('--- START: Phase 7 - Installer completes work ---');
        const completionSection = page.getByTestId('installer-completion-section');
        await expect(completionSection).toBeVisible();
        await completionSection.locator('input[type="file"]').setInputFiles({
            name: 'proof.png',
            mimeType: 'image/png',
            buffer: Buffer.from('test')
        });
        // Verify file is listed
        await expect(completionSection.getByText('proof.png')).toBeVisible();
        // explicit wait for button
        const submitBtn = page.getByTestId('submit-for-review-button');
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();
        await helper.form.waitForToast('Submitted for Confirmation');
        await helper.job.waitForJobStatus('Pending Confirmation');
        console.log('[PASS] Phase 7 Complete: Work submitted');

        // --- PHASE 8: JOB GIVER APPROVES & PAYS ---
        console.log('--- START: Phase 8 - Job Giver approves work ---');
        await helper.auth.logout(); // Ensure clean session
        await helper.auth.loginAsJobGiver();
        await expect(page.getByText('Active Jobs').first()).toBeVisible({ timeout: TIMEOUTS.medium });
        await page.goto(`/dashboard/jobs/${jobId}`);

        const approveBtn = page.getByTestId('approve-release-button');
        await expect(approveBtn).toBeVisible({ timeout: TIMEOUTS.long });
        await approveBtn.click();
        await helper.form.waitForToast('Job Approved & Payment Released!');
        await helper.job.waitForJobStatus('Completed');
        console.log('[PASS] Phase 8 Complete: Job Completed');

        // --- PHASE 9: VERIFY INVOICE GENERATION ---
        console.log('--- START: Phase 9 - Verify Invoice Generation ---');

        // Reload page to ensure actions panel updates
        await page.reload();
        await helper.job.waitForJobStatus('Completed');

        const invoiceBtn = page.getByTestId('download-invoice-button');
        await expect(invoiceBtn).toBeVisible();

        const platformInvoiceBtn = page.getByTestId('download-platform-invoice-button');
        await expect(platformInvoiceBtn).toBeVisible();

        // Verify Service Invoice Button Opens New Tab
        const [invoicePage] = await Promise.all([
            context.waitForEvent('page'),
            invoiceBtn.click()
        ]);
        await invoicePage.waitForLoadState();
        // Check for content in the new tab
        await expect(invoicePage.getByText('Billed To (Job Giver):')).toBeVisible();
        console.log('[PASS] Service Invoice Page Verified');
        await invoicePage.close();

        // Verify Platform Receipt Button Opens New Tab
        const [platformPage] = await Promise.all([
            context.waitForEvent('page'),
            platformInvoiceBtn.click()
        ]);
        await platformPage.waitForLoadState();
        // Check for content in the new tab
        await expect(platformPage.getByText('Platform Receipt')).toBeVisible();
        console.log('[PASS] Platform Receipt Page Verified');
        await platformPage.close();

        console.log('[PASS] Phase 9 Complete: Invoice generation verified');


        // --- PHASE 10: VERIFY REVIEW & RATING ---
        console.log('--- START: Phase 10 - Verify Review & Rating ---');

        // 1. Job Giver Submits Review
        await expect(page.getByText('Rate Your Experience')).toBeVisible();
        await page.getByTestId('rating-star-5').click();
        await page.getByTestId('rating-comment').fill('Great installer, highly recommended!');
        await page.getByTestId('submit-review-button').click();

        // Verify Sealed State
        await expect(page.getByTestId('review-locked-card')).toBeVisible();
        await expect(page.getByText('Review Submitted')).toBeVisible();
        console.log('[PASS] Job Giver Review Submitted (Sealed)');

        // 2. Switch to Installer to Submit Review
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.job.waitForJobStatus('Completed');

        // Verify "The other party has already reviewed you" message in Card Description
        await expect(page.getByText('The other party has already reviewed you!')).toBeVisible();

        // Installer Submits Review
        await expect(page.getByText('Rate Your Experience')).toBeVisible();
        await page.getByTestId('rating-star-5').click();
        await page.getByTestId('rating-comment').fill('Excellent client, clear requirements.');
        await page.getByTestId('submit-review-button').click();

        // 3. Verify Reveal (Both reviews visible)
        await expect(page.getByTestId('reviews-revealed-section')).toBeVisible();
        await expect(page.getByText('You Rated Them')).toBeVisible();
        await expect(page.getByText('They Rated You')).toBeVisible();
        await expect(page.getByText('Great installer, highly recommended!')).toBeVisible(); // Job Giver's review (as "They") - Wait, Installer is viewing
        // Installer viewing: "They Rated You" should satisfy Giver's review text.
        // Component logic: 
        // myReview = InstallerReview. theirReview = JobGiverReview.
        // "They Rated You" card shows `theirReview.review`.
        // So yes, Installer sees 'Great installer...'? NO. Giver wrote "Great installer".

        console.log('[PASS] Phase 10 Complete: Reviews Verified');

        await context.close();
    });
});
