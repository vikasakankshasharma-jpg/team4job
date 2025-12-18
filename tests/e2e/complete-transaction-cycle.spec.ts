import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, TEST_CREDENTIALS, getDateString, generateUniqueJobTitle, JOB_STATUSES } from '../fixtures/test-data';

/**
 * E2E Test: Complete Transaction Cycle
 * Tests the full workflow: Post → Bid → Award → Pay → Complete → Release
 */

test.describe('Complete Transaction Cycle E2E', () => {
    let jobId: string;
    const uniqueJobTitle = generateUniqueJobTitle();

    test.beforeEach(async ({ page }) => {
        // Enable console logging for debugging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser Error:', msg.text());
            }
        });
    });

    test('Phase 1: Job Giver posts a new job', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();
        await expect(page).toHaveURL(/\/dashboard/);

        // Navigate to Post Job page
        await helper.nav.goToPostJob();
        await expect(page).toHaveURL(/\/post-job/);

        // Fill job posting form using name attributes for reliability
        await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
        await page.fill('input[name="jobTitle"]', uniqueJobTitle);
        await page.fill('textarea[name="jobDescription"]', TEST_JOB_DATA.description);
        await page.fill('input[name="skills"]', TEST_JOB_DATA.skills);

        // Fill address details
        await page.fill('input[placeholder*="110001"]', TEST_JOB_DATA.pincode);
        await page.waitForTimeout(2000); // Wait for pincode lookup

        // Select Post Office (required for validation min length 8)
        const poTrigger = page.locator('button:has-text("Select Post Office"), [role="combobox"]:has-text("Select Post Office")');
        if (await poTrigger.isVisible()) {
            await poTrigger.click();
            await page.locator('[role="option"]').first().click();
        }
        await page.fill('input[name="address.house"]', TEST_JOB_DATA.house);
        await page.fill('input[name="address.street"]', TEST_JOB_DATA.street);
        await page.fill('input[name="address.landmark"]', TEST_JOB_DATA.landmark);

        // Set full address (manual entry)
        const fullAddress = `${TEST_JOB_DATA.house}, ${TEST_JOB_DATA.street}, ${TEST_JOB_DATA.pincode}`;
        await page.fill('input[name="address.fullAddress"]', fullAddress);

        // Set dates
        await page.fill('input[name="deadline"]', getDateString(2));
        await page.fill('input[name="jobStartDate"]', getDateString(5));

        // Set budget
        await page.fill('input[name="priceEstimate.min"]', TEST_JOB_DATA.minBudget.toString());
        await page.fill('input[name="priceEstimate.max"]', TEST_JOB_DATA.maxBudget.toString());

        // Submit the form
        await helper.form.clickButton('Post Job');

        // Wait for success and redirect
        await helper.form.waitForToast('Job Posted Successfully!');
        await helper.wait.waitForUrl(/\/posted-jobs/);

        // Verify job appears in posted jobs list
        await expect(page.locator(`text=${uniqueJobTitle}`)).toBeVisible();

        // Extract job ID for next tests
        await page.click(`text=${uniqueJobTitle}`);
        jobId = await helper.job.getJobIdFromUrl();
        expect(jobId).toMatch(/^JOB-/);

        console.log('✅ Phase 1 Complete: Job Posted with ID:', jobId);
    });

    test('Phase 2: Installer places a bid', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Installer
        await helper.auth.loginAsInstaller();

        // Navigate to Browse Jobs
        await helper.nav.goToBrowseJobs();

        // Find and click on the posted job
        await page.fill('input[placeholder*="Search"]', uniqueJobTitle);
        await page.waitForTimeout(500);
        await page.click(`text=${uniqueJobTitle}`);

        // Verify job details
        await expect(page.locator('h1, h2').filter({ hasText: uniqueJobTitle })).toBeVisible();
        await expect(page.locator(`text=${JOB_STATUSES.openForBidding}`)).toBeVisible();

        // Click Place Bid button
        await helper.form.clickButton('Place Bid');

        // Fill bid form
        await page.fill('input[name="bidAmount"], input[placeholder*="bid"]', TEST_JOB_DATA.bidAmount.toString());
        await page.fill('textarea[name="coverLetter"], textarea[placeholder*="cover"]', TEST_JOB_DATA.coverLetter);

        // Submit bid
        await helper.form.clickButton('Submit Bid');

        // Wait for success
        await helper.form.waitForToast('Bid submitted successfully');

        // Verify bid appears in My Bids
        await helper.nav.goToMyBids();
        await expect(page.locator(`text=${uniqueJobTitle}`)).toBeVisible();

        console.log('✅ Phase 2 Complete: Bid placed on job');
    });

    test('Phase 3: Job Giver awards the job', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();

        // Navigate to posted jobs
        await helper.nav.goToPostedJobs();
        await page.click(`text=${uniqueJobTitle}`);

        // Go to Bids tab
        await page.click('text=Bids, [role="tab"]:has-text("Bids")');

        // Verify bid is visible
        await expect(page.locator(`text=₹${TEST_JOB_DATA.bidAmount}`)).toBeVisible();

        // Award the job
        await helper.form.clickButton('Award Job');

        // Select simultaneous strategy
        await page.click('text=Simultaneous');
        await helper.form.clickButton('Confirm');

        // Wait for success
        await helper.form.waitForToast('Job awarded');

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.pendingAcceptance);

        console.log('✅ Phase 3 Complete: Job awarded to installer');
    });

    test('Phase 4: Installer accepts the offer', async ({ page }) => {
        const helper = new TestHelper(page);

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

        console.log('✅ Phase 4 Complete: Offer accepted');
    });

    test('Phase 5: Job Giver funds the project', async ({ page }) => {
        const helper = new TestHelper(page);

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
        await expect(page.locator(`text=₹${TEST_JOB_DATA.bidAmount}`)).toBeVisible();

        // Proceed to payment
        await helper.form.clickButton('Proceed to Payment');

        // Wait for Cashfree payment page
        await page.waitForTimeout(3000);

        // Fill payment details (Cashfree test mode)
        const cardInput = page.locator('input[placeholder*="Card"], input[name*="card"]').first();
        if (await cardInput.isVisible()) {
            await cardInput.fill(TEST_CREDENTIALS.testCard.number);
            await page.fill('input[placeholder*="CVV"], input[name*="cvv"]', TEST_CREDENTIALS.testCard.cvv);
            await page.fill('input[placeholder*="Expiry"], input[name*="expiry"]', TEST_CREDENTIALS.testCard.expiry);

            // Submit payment
            await page.click('button:has-text("Pay"), button[type="submit"]');

            // Enter OTP if required
            const otpInput = page.locator('input[placeholder*="OTP"], input[name*="otp"]').first();
            if (await otpInput.isVisible({ timeout: 5000 })) {
                await otpInput.fill(TEST_CREDENTIALS.otp);
                await page.click('button:has-text("Submit"), button:has-text("Verify")');
            }
        }

        // Wait for redirect back to platform
        await page.waitForURL(/\/dashboard/, { timeout: 60000 });

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.inProgress);

        console.log('✅ Phase 5 Complete: Project funded');
    });

    test('Phase 6: Installer submits work', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Installer
        await helper.auth.loginAsInstaller();

        // Navigate to the job
        await helper.nav.goToMyBids();
        await page.click(`text=${uniqueJobTitle}`);

        // Verify status
        await helper.job.waitForJobStatus(JOB_STATUSES.inProgress);

        // Click Submit Work
        await helper.form.clickButton('Submit Work');

        // Upload proof of work (create a test file)
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
            // Create a simple test image buffer
            const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            await fileInput.setInputFiles({
                name: 'proof-of-work.png',
                mimeType: 'image/png',
                buffer,
            });
        }

        // Add completion notes
        await page.fill('textarea[name="completionNotes"], textarea[placeholder*="notes"]',
            'All 4 cameras installed and tested successfully. DVR configured with remote access. System is fully operational.');

        // Submit
        await helper.form.clickButton('Submit for Review');

        // Wait for success
        await helper.form.waitForToast('Work submitted');

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.pendingConfirmation);

        console.log('✅ Phase 6 Complete: Work submitted');
    });

    test('Phase 7: Job Giver approves and releases payment', async ({ page }) => {
        const helper = new TestHelper(page);

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

        // Confirm if dialog appears
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }

        // Wait for success
        await helper.form.waitForToast('Payment released');

        // Verify status changed
        await helper.job.waitForJobStatus(JOB_STATUSES.completed);

        console.log('✅ Phase 7 Complete: Payment released');
    });

    test('Phase 8: Job Giver leaves review', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();

        // Navigate to the job
        await helper.nav.goToPostedJobs();
        await page.click(`text=${uniqueJobTitle}`);

        // Click Leave Review
        await helper.form.clickButton('Leave Review');

        // Select 5 stars
        await page.click('[data-rating="5"], .star:nth-child(5)');

        // Write review
        await page.fill('textarea[name="review"], textarea[placeholder*="review"]',
            'Excellent work! Professional installation and great communication.');

        // Submit review
        await helper.form.clickButton('Submit Review');

        // Wait for success
        await helper.form.waitForToast('Review submitted');

        // Verify review appears
        await expect(page.locator('text=Excellent work!')).toBeVisible();

        console.log('✅ Phase 8 Complete: Review submitted');
    });

    test('Phase 9: Admin verifies transactions', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Admin
        await helper.auth.loginAsAdmin();

        // Navigate to Transactions
        await helper.nav.goToTransactions();

        // Search for job ID
        await page.fill('input[placeholder*="Search"]', jobId);
        await page.waitForTimeout(500);

        // Verify transactions exist
        await expect(page.locator(`text=${jobId}`).first()).toBeVisible();

        // Verify transaction types
        await expect(page.locator('text=Payment, text=Payout')).toBeVisible();

        // Navigate to All Jobs
        await page.click('text=All Jobs, a[href*="/all-jobs"]');

        // Search for the job
        await page.fill('input[placeholder*="Search"]', uniqueJobTitle);
        await page.waitForTimeout(500);

        // Verify job status is Completed
        await expect(page.locator(`text=${JOB_STATUSES.completed}`)).toBeVisible();

        console.log('✅ Phase 9 Complete: Admin verification successful');
        console.log('🎉 ALL PHASES COMPLETED SUCCESSFULLY!');
    });
});
