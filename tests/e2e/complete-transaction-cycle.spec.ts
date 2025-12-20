import * as fs from 'fs';
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, TEST_CREDENTIALS, getDateString, generateUniqueJobTitle, JOB_STATUSES, TIMEOUTS } from '../fixtures/test-data';

/**
 * E2E Test: Complete Transaction Cycle
 * Tests the full workflow: Post â†’ Bid â†’ Award â†’ Pay â†’ Complete â†’ Release
 */


test.describe('Complete Transaction Cycle E2E', () => {
    let jobId: string;
    let uniqueJobTitle = generateUniqueJobTitle();
    test.beforeEach(async ({ page }) => {
        // Enable console logging for debugging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Creating new job with ID:')) {
                const capturedId = text.split('ID: ')[1]?.trim();
                if (capturedId) {
                    jobId = capturedId;
                    console.log(`TEST: Captured Job ID: ${jobId}`);
                }
            }
            if (text.includes('JobDetailClient')) {
                console.log(`APP: ${text}`);
            }
        });
    });

    test('Complete Transaction Cycle: Job Giver posts Job and Installer bids', async ({ page }) => {
        // Capture browser console logs
        page.on('console', msg => {
            console.log(`BROWSER CONSOLE: ${msg.type()}: ${msg.text()}`);
        });

        (uniqueJobTitle as any) = `${TEST_JOB_DATA.title} - ${Date.now()}`;
        const helper = new TestHelper(page);

        // --- PART 1: JOB GIVER POSTS JOB ---
        console.log('--- START: Job Giver posts a new job ---');

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();
        await expect(page).toHaveURL(/\/dashboard/);

        // Mock Pincode API to avoid external dependency flakiness
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

        // Navigate to Post Job page
        await helper.nav.goToPostJob();
        await expect(page).toHaveURL(/\/post-job/);
        console.log('Test: Post Job page loaded. Current URL:', page.url());

        // Wait for page heading to ensure basic render
        await expect(page.locator('h1').filter({ hasText: "Post a New Job" }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
        console.log('Test: Page heading found.');

        // Wait for form to be visible
        await expect(page.locator('form').first()).toBeVisible({ timeout: TIMEOUTS.medium });
        console.log('Test: Form found.');

        // Fill job posting form using name attributes for reliability
        console.log('Test: Looking for job-category-select...');
        const categorySelect = page.getByRole('combobox', { name: 'Job Category' });

        // Ensure it's not just visible but also enabled
        await categorySelect.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
        console.log('Test: job-category-select is visible. Clicking it...');
        await categorySelect.click();

        console.log('Test: Waiting for category option...');
        const option = page.locator(`[role="option"]:has-text("${TEST_JOB_DATA.category}")`);
        await expect(option).toBeVisible({ timeout: TIMEOUTS.medium });
        await option.click();
        console.log(`Test: Category "${TEST_JOB_DATA.category}" selected.`);

        // Wait for UI to settle after selection
        await page.waitForTimeout(1000);

        await page.fill('input[name="jobTitle"]', uniqueJobTitle);

        console.log('Test: Filling job description...');
        const descriptionInput = page.locator('textarea[name="jobDescription"], [data-testid="job-description-input"]').first();
        await descriptionInput.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
        await descriptionInput.fill(TEST_JOB_DATA.description);

        await page.fill('input[name="skills"]', TEST_JOB_DATA.skills);

        // Fill address details
        console.log('Test: Filling pincode...');
        await page.fill('input[placeholder*="110001"]', TEST_JOB_DATA.pincode);
        await page.waitForTimeout(2000); // Wait for pincode lookup

        // Select Post Office
        console.log('Test: Selecting Post Office...');
        const poTrigger = page.locator('button:has-text("Select Post Office"), [role="combobox"]:has-text("Select Post Office")');

        // Wait for lookup to complete - it should either auto-select or enable the trigger
        await page.waitForTimeout(3000);

        let currentPO = await poTrigger.textContent();
        console.log('Test: Current location trigger value:', currentPO);

        if (currentPO?.includes('Select Post Office')) {
            console.log('Test: Post Office not auto-selected. Attempting to click...');
            if (await poTrigger.isEnabled()) {
                await poTrigger.click();
                await page.waitForSelector('[role="option"]', { timeout: TIMEOUTS.medium });
                await page.locator('[role="option"]').first().click();
                console.log('Test: Post Office selected manually.');
            } else {
                console.warn('Test: Post Office trigger is still disabled. Pincode lookup might have failed.');
            }
        } else {
            console.log('Test: Post Office already selected:', currentPO);
        }

        console.log('Test: Filling address details...');
        await page.fill('input[name="address.house"]', TEST_JOB_DATA.house);
        await page.fill('input[name="address.street"]', TEST_JOB_DATA.street);
        await page.fill('input[name="address.landmark"]', TEST_JOB_DATA.landmark);

        // Set full address (manual entry)
        const fullAddress = `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street}, ${TEST_JOB_DATA.pincode}`;
        await page.fill('input[name="address.fullAddress"]', fullAddress);

        // Set dates
        console.log('Test: Setting dates...');
        await page.fill('input[name="deadline"]', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateString(10));

        // Budget
        console.log('Test: Filling budget...');
        await page.fill('input[name="priceEstimate.min"]', TEST_JOB_DATA.minBudget.toString());
        await page.fill('input[name="priceEstimate.max"]', TEST_JOB_DATA.maxBudget.toString());

        // Submit the form
        console.log('Test: Clicking Post Job button...');
        const submitBtn = page.getByRole('button', { name: "Post Job" }).first();
        await expect(submitBtn).toBeEnabled();

        // Diagnostic: Take screenshot BEFORE click
        await page.screenshot({ path: `test-results/pre-click-${Date.now()}.png` });

        // Diagnostic: Log form values and capture validation errors
        const preSubmitErrors = await page.locator('.text-destructive, [role="alert"]').allTextContents();
        if (preSubmitErrors.length > 0) {
            console.error('Test: Validation errors found BEFORE submission:', preSubmitErrors);
        }

        // Try to click using more robust methods
        console.log('Test: Attempting to click "Post Job" button via evaluate...');
        await page.evaluate(() => {
            const allTestIds = Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'));
            console.log('Test: All data-testids on page:', allTestIds);

            const btn = document.querySelector('[data-testid="post-job-button"]') ||
                Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Post Job'));

            if (btn) {
                console.log('Test: Clicking button via JS eval:', (btn as HTMLElement).textContent);
                (btn as HTMLElement).click();
            } else {
                console.error('Test: Button NOT found in JS eval after searching test-ids and text');
            }
        });

        console.log('Test: Post Job button click triggered via evaluate.');

        // Wait for potential toast
        const postJobToast = page.locator('.toast, [role="alert"]');
        try {
            await expect(postJobToast.first()).toBeVisible({ timeout: 5000 });
            const toastText = await postJobToast.first().innerText();
            console.log(`Test: Toast appeared: "${toastText}"`);
        } catch (e) {
            console.log('Test: No toast appeared within 5s');
        }

        // Wait for success and redirect
        // The real app redirects to /dashboard/jobs/JOB-...
        try {
            console.log(`Test: Post Job button clicked at ${page.url()}. Waiting for redirect...`);
            await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });
            console.log(`Test: Redirected successfully to ${page.url()}.`);
            jobId = await helper.job.getJobIdFromUrl();
        } catch (error) {
            console.warn(`Test: Redirect timed out or failed. Current URL: ${page.url()}`);
            // Take a screenshot of the form if it failed to redirect
            await page.screenshot({ path: `test-results/redirect-failure-${Date.now()}.png` });

            // Fallback: Check posted-jobs
            console.log('Test: Manually navigating to posted-jobs...');
            await page.goto('/dashboard/posted-jobs');
        }


        // Verify job appears in list or detail page
        console.log(`Test: Verifying job "${uniqueJobTitle}"...`);

        if (page.url().includes(`/dashboard/jobs/JOB-`)) {
            console.log('Test: On Job Detail page, verifying title...');
            await expect(page.getByText(uniqueJobTitle).first()).toBeVisible({ timeout: TIMEOUTS.medium });
            jobId = jobId || await helper.job.getJobIdFromUrl();
        } else {
            // Fallback: Check posted-jobs list
            console.log('Test: Not on detail page, checking posted-jobs list...');
            if (!page.url().includes('/dashboard/posted-jobs')) {
                await page.goto('/dashboard/posted-jobs');
            }
            await page.reload();
            await page.waitForTimeout(2000);
            const jobLink = page.getByRole('link', { name: new RegExp(uniqueJobTitle, 'i') }).first();
            await expect(jobLink).toBeVisible({ timeout: TIMEOUTS.medium });

            if (!jobId) {
                await jobLink.click();
                jobId = await helper.job.getJobIdFromUrl();
            }
        }

        console.log(`Test: Part 1 complete. Job ID: ${jobId}`);
        expect(jobId).toMatch(/^JOB-/);
        console.log('âœ… Part 1 Complete: Job Posted with ID:', jobId);

        // Logout Job Giver
        await helper.auth.logout();

        // --- PART 2: INSTALLER PLACES BID ---
        console.log('--- START: Installer places a bid ---');

        // Login as Installer
        await helper.auth.loginAsInstaller();

        // Navigate directly to the job page to avoid search flakiness
        console.log(`Test: Navigating directly to job page: ${jobId}...`);
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Verify Job Detail Page
        console.log('Test: Verifying Job Detail Page...');

        // Wait for page to load
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium });

        // Wait for the specific job title to be visible on the detail page
        console.log(`Test: Waiting for job title to appear: "${uniqueJobTitle}"`);
        await page.reload();
        await page.waitForTimeout(2000);
        await expect(page.getByText(uniqueJobTitle).first()).toBeVisible({ timeout: TIMEOUTS.medium });
        console.log('Test: Job details verified');

        // Click Place Bid button
        console.log('Test: Clicking Place Bid button...');
        fs.appendFileSync('trace.log', 'Clicking Place Bid\n');
        await helper.form.clickButton('Place Bid');
        console.log('Test: Place Bid button clicked');
        fs.appendFileSync('trace.log', 'Place Bid clicked\n');
        // Fill bid form
        console.log('Test: Filling bid form...');
        const bidInput = page.getByRole('spinbutton', { name: /Bid Amount/i }).or(page.locator('input[name="bidAmount"]'));

        await expect(bidInput).toBeVisible({ timeout: TIMEOUTS.medium });
        await bidInput.fill(TEST_JOB_DATA.bidAmount.toString());

        await page.fill('textarea[name="coverLetter"]', TEST_JOB_DATA.coverLetter);

        // Submit bid - ensure button is visible and click it
        console.log('Test: Clicking Submit Bid button...');
        const submitBidBtn = page.getByRole('button', { name: /Submit Bid/i }).or(page.locator('#bid-section button:has-text("Submit Bid")'));
        await submitBidBtn.scrollIntoViewIfNeeded();
        await submitBidBtn.click({ force: true });
        console.log('Test: Submit Bid button clicked');

        // Wait for success or error
        const successToast = page.getByText(/Bid Placed/i).or(page.locator('[role="status"]')).first();
        await expect(successToast).toBeVisible({ timeout: TIMEOUTS.medium });
        const toastText = await successToast.innerText();
        console.log(`Test: Toast appeared: "${toastText}"`);

        await expect(successToast).toContainText('Bid Placed!');

        // Verify bid appears in My Bids
        await helper.nav.goToMyBids();
        await expect(page.locator(`text=${uniqueJobTitle}`)).toBeVisible();

        console.log('âœ… Phase 2 Complete: Bid placed on job');

        // Logout Installer
        await helper.auth.logout();


        // --- PART 3: JOB GIVER AWARDS JOB ---
        console.log('--- START: Job Giver awards job ---');

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();

        // Navigate to posted jobs
        await helper.nav.goToPostedJobs();
        await page.click(`text=${uniqueJobTitle}`);

        // Go to Bids section
        console.log('Test: Navigating to Bids section...');
        await page.locator('#bids-section').scrollIntoViewIfNeeded();

        // Verify bids section is visible with the bid
        await expect(page.locator('#bids-section')).toBeVisible();

        // Close bidding to enable awarding
        console.log('Test: Clicking Close Bidding button...');
        await page.click('button:has-text("Close Bidding")');

        // Confirm in the AlertDialog
        console.log('Test: Confirming Close Bidding...');
        await page.waitForTimeout(500);
        const confirmBtn = page.locator('button').filter({ hasText: 'Close Bidding' }).last();
        await confirmBtn.click();

        // Wait for toast confirmation
        await helper.form.waitForToast('Bidding Closed');
        console.log('âœ… Bidding closed successfully');

        // Now select installer
        console.log('Test: Selecting installer for award...');
        // Click the first bid card to select it
        await page.locator('#bids-section').locator('.cursor-pointer').first().click();

        // Award the job
        await helper.form.clickButton('Send Offer');

        // Wait for success toast
        await helper.form.waitForToast('Offers Sent!');

        console.log('âœ… Phase 3 Complete: Job awarded to installer');


        // Logout Job Giver
        await helper.auth.logout();


        // --- PART 4: INSTALLER ACCEPTS OFFER ---
        console.log('--- START: Installer accepts offer ---');

        // Login as Installer
        await helper.auth.loginAsInstaller();

        // Navigate to My Bids
        await helper.nav.goToMyBids();
        await page.click(`text=${uniqueJobTitle}`);

        // Verify offer received
        await expect(page.locator('text=Offer Received, text=Accept Offer')).toBeVisible();

        // Accept the offer
        await helper.form.clickButton('Accept Offer');

        // Confirm if dialog appears
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }

        // Wait for success
        await helper.form.waitForToast('Offer accepted');

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.pendingFunding);
        console.log('âœ… Part 4 Complete: Offer accepted');

        // Logout Installer
        await helper.auth.logout();


        // --- PART 5: JOB GIVER FUNDS PROJECT ---
        console.log('--- START: Job Giver funds project ---');

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();

        // Navigate to the job
        await helper.nav.goToPostedJobs();
        await page.click(`text=${uniqueJobTitle}`);

        // Verify status
        await helper.job.waitForJobStatus(JOB_STATUSES.pendingFunding);

        // Click Fund Project
        await helper.form.clickButton('Fund Project');

        // Review payment details
        await expect(page.locator(`text=â‚¹${TEST_JOB_DATA.bidAmount}`)).toBeVisible();

        // Proceed to payment
        await helper.form.clickButton('Proceed to Payment');

        // Wait for Cashfree payment page
        await page.waitForTimeout(3000);

        // Fill payment details (Cashfree test mode)
        // Note: Using a Try/Catch or conditional check for iframe/redirect robustness
        const cardInput = page.locator('input[placeholder*="Card"], input[name*="card"]').first();
        if (await cardInput.isVisible({ timeout: 10000 })) {
            await cardInput.fill(TEST_CREDENTIALS.testCard.number);
            await page.fill('input[placeholder*="CVV"], input[name*="cvv"]', TEST_CREDENTIALS.testCard.cvv);
            await page.fill('input[placeholder*="Expiry"], input[name*="expiry"]', TEST_CREDENTIALS.testCard.expiry);

            // Submit payment
            await page.click('button:has-text("Pay"), button[type="submit"]');

            // Enter OTP if required
            const otpInput = page.locator('input[placeholder*="OTP"], input[name*="otp"]').first();
            if (await otpInput.isVisible({ timeout: 10000 })) {
                await otpInput.fill(TEST_CREDENTIALS.otp);
                await page.click('button:has-text("Submit"), button:has-text("Verify")');
            }
        }

        // Wait for redirect back to platform
        await page.waitForURL(/\/dashboard/, { timeout: 60000 });

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.inProgress);
        console.log('âœ… Part 5 Complete: Project funded');

        // Logout Job Giver
        await helper.auth.logout();


        // --- PART 6: INSTALLER SUBMITS WORK ---
        console.log('--- START: Installer submits work ---');

        // Login as Installer
        await helper.auth.loginAsInstaller();

        // Navigate to the job
        await helper.nav.goToMyBids();
        await page.click(`text=${uniqueJobTitle}`);

        // Verify status
        await helper.job.waitForJobStatus(JOB_STATUSES.inProgress);

        // Click Submit Work
        await helper.form.clickButton('Submit Work for Completion');

        // Upload proof of work
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
            const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            await fileInput.setInputFiles({
                name: 'proof-of-work.png',
                mimeType: 'image/png',
                buffer,
            });
        }

        // Add completion notes
        await page.fill('textarea[name="completionNotes"], textarea[placeholder*="notes"]',
            'Work completed successfully as per requirements.');

        // Submit
        await helper.form.clickButton('Submit for Review');

        // Wait for success
        await helper.form.waitForToast('Work submitted');

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.pendingConfirmation);
        console.log('âœ… Part 6 Complete: Work submitted');

        // Logout Installer
        await helper.auth.logout();


        // --- PART 7: JOB GIVER APPROVES WORK ---
        console.log('--- START: Job Giver approves work ---');

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();

        // Navigate to the job
        await helper.nav.goToPostedJobs();
        await page.click(`text=${uniqueJobTitle}`);

        // Verify status
        await helper.job.waitForJobStatus(JOB_STATUSES.pendingConfirmation);

        // Click Review Work
        await helper.form.clickButton('Review Work');

        // Verify proof of work is visible
        await expect(page.locator('img, [data-testid="proof-image"]')).toBeVisible();

        // Approve and release payment
        await helper.form.clickButton('Approve & Release Payment');

        // Confirm
        const confirmApprove = page.locator('button:has-text("Confirm")');
        if (await confirmApprove.isVisible()) {
            await confirmApprove.click();
        }

        // Wait for success
        await helper.form.waitForToast('Payment released');

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.completed);
        console.log('âœ… Part 7 Complete: Payment released');


        // --- PART 8: JOB GIVER LEAVES REVIEW ---
        console.log('--- START: Job Giver leaves review ---');

        // Click Leave Review
        // Note: Sometimes button appears immediately, sometimes needs refresh or wait. 
        // Assuming it's visible on the completed page.
        // If 'Leave Review' is already clicked in previous step or auto-shown, handle it.
        // But usually it's a button.
        const reviewBtn = page.locator('button:has-text("Leave Review")');
        if (await reviewBtn.isVisible()) {
            await reviewBtn.click();
        }

        // Select 5 stars
        await page.click('[data-rating="5"], .star:nth-child(5)');

        // Write review
        await page.fill('textarea[name="review"], textarea[placeholder*="review"]',
            'Excellent work! Efficient.');

        // Submit review
        await helper.form.clickButton('Submit Review');

        // Wait for success
        await helper.form.waitForToast('Review submitted');

        // Verify review appears
        await expect(page.locator('text=Excellent work!')).toBeVisible();
        console.log('âœ… Part 8 Complete: Review submitted');

        // Logout Job Giver
        await helper.auth.logout();


        // --- PART 9: ADMIN VERIFICATION ---
        console.log('--- START: Admin verification ---');

        // Login as Admin
        await helper.auth.loginAsAdmin();

        // Navigate to Transactions
        await helper.nav.goToTransactions();

        // Search for job ID
        await page.fill('input[placeholder*="Search"]', jobId);
        await page.waitForTimeout(500);

        // Verify transactions exist (Payment + Payout)
        // payment = Job Giver -> Platform
        // payout = Platform -> Installer
        await expect(page.locator(`text=${jobId}`).first()).toBeVisible();

        // Navigate to All Jobs
        await page.click('text=All Jobs, a[href*="/all-jobs"]');

        // Search for the job
        await page.fill('input[placeholder*="Search"]', uniqueJobTitle);
        await page.waitForTimeout(500);

        // Verify job status is Completed
        await expect(page.locator(`text=${JOB_STATUSES.completed}`)).toBeVisible();

        console.log('âœ… Part 9 Complete: Admin verification successful');
        console.log('ðŸŽ‰ðŸŽ‰ðŸŽ‰ ALL PHASES COMPLETED SUCCESSFULLY! ðŸŽ‰ðŸŽ‰ðŸŽ‰');
        console.log('âœ… E2E Test Complete: Phases 1-2 verified (Job Posting and Bidding)');
    });
});

