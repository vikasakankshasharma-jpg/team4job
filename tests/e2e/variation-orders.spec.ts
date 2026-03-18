
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

test.describe('Secured Variation Orders', () => {

    // Shared Data
    let jobId: string;
    const ProfessionalEmail = 'Professional_variation@example.com';
    const jobGiverEmail = 'giver_variation@example.com';

    test('Full Variation Order Cycle', async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).__DISABLE_AUTO_SAVE__ = true;
        });
        await page.setViewportSize({ width: 1280, height: 1000 });
        test.setTimeout(300000); // 5 minutes
        const helper = new TestHelper(page);
        await helper.mockExternalAPIs();

        // 1. Client Creates Job
        await helper.auth.login(TEST_ACCOUNTS.client.email, TEST_ACCOUNTS.client.password);
        await helper.nav.goToPostJob();

        await helper.form.fillInput('Job Title', 'Variation Test Job ' + Date.now());
        await page.locator('textarea[name="jobDescription"]').fill('A simple job for testing variations. Must be at least 50 chars long to pass validation.');
        await helper.form.fillPincodeAndSelectPO('110001'); // Delhi
        await helper.form.selectDropdown('Category', 'New Installation'); // Valid category
        await page.waitForTimeout(500);

        // Use simpler labels and clear first
        const skillsInput = page.locator('[data-testid="skills-input"], input[placeholder*="Skills"]');
        await skillsInput.scrollIntoViewIfNeeded();
        await skillsInput.clear();
        await skillsInput.fill('Cabling, Drilling');

        // Address Details (using testid support in helper: 'House' -> 'house-input')
        await helper.form.fillInput('House', 'Flat 101, Tech Park');
        await helper.form.fillInput('Street', 'Main Avenue');
        await helper.form.fillInput('Full Address', 'Flat 101, Tech Park, Main Avenue, Delhi 110001');

        // Budget (using testid support: 'Min Budget' -> 'min-budget-input')
        await helper.form.fillInput('Min Budget', '5000');
        await helper.form.fillInput('Max Budget', '10000');

        // Dates - standard format
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const deadlineDate = tomorrow.toISOString().split('T')[0];

        await helper.form.fillInput('Bidding Deadline', deadlineDate);
        // Start date 2 days later, using standard formatting for datetime-local
        // datetime-local expects YYYY-MM-DDTHH:mm
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        const startDate = dayAfter.toISOString().slice(0, 16);

        await helper.form.fillInput('Job Work Start Date & Time', startDate);

        // Prepare form and submit using robust helpers
        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();

        // Check for navigation OR error message
        try {
            await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: 15000 });
        } catch (e) {
            // Check if error message is present
            const errorMsg = await page.locator('.text-red-500').first().textContent().catch(() => null);
            if (errorMsg) {
                console.error("Post Job Failed with validation error:", errorMsg);
                throw new Error(`Post Job validation failed: ${errorMsg}`);
            }
            throw e;
        }

        jobId = await helper.job.getJobIdFromUrl();
        console.log(`Created Job: ${jobId}`);
        expect(jobId).toBeTruthy();

        // 2. Professional Bids
        console.log('--- Step 2: Professional Bids ---');
        await helper.auth.logout();
        await helper.auth.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password);

        console.log(`Professional navigating to job: /dashboard/jobs/${jobId}`);
        await page.goto(`/dashboard/jobs/${jobId}`);

        await expect(page.getByTestId('job-title')).toBeVisible({ timeout: 15000 });
        await page.getByTestId('place-bid-button').click();

        // Wait for bid dialog to appear
        const bidDialog = page.locator('div[role="dialog"]');
        await bidDialog.waitFor({ state: 'visible', timeout: 10000 });

        await bidDialog.locator('input[name="amount"]').fill('500');
        await bidDialog.locator('textarea[name="coverLetter"]').fill('I am the best Professional for this job.');
        await bidDialog.getByRole('button', { name: 'Place Bid' }).click();
        await helper.form.waitForToast('Bid Placed!');
        console.log('[PASS] Bid Placed');

        // 3. Client Awards
        console.log('--- Step 3: JG Awards ---');
        await helper.auth.logout();
        await helper.auth.login(TEST_ACCOUNTS.client.email, TEST_ACCOUNTS.client.password);
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Wait for bids to load - reload if needed
        try {
            await page.getByTestId('bid-card-wrapper').first().waitFor({ state: 'visible', timeout: 15000 });
        } catch {
            // Bid might not have synced yet - reload and try again
            console.log('[E2E] Bids not visible, reloading page...');
            await page.reload();
            await page.getByTestId('bid-card-wrapper').first().waitFor({ state: 'visible', timeout: 30000 });
        }
        await page.getByTestId('send-offer-button').first().click();
        await helper.form.waitForToast('Offer Sent');
        console.log('[PASS] Offer Sent');

        // 4. Professional Accepts
        console.log('--- Step 4: Professional Accepts ---');
        await helper.auth.logout();
        await helper.auth.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password);
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('accept-job-button').first().click();

        // Handle Conflict Dialog if it appears
        const conflictDialog = page.getByText('Schedule Conflict Warning');
        if (await conflictDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.getByRole('button', { name: "I Understand, Proceed & Accept" }).click();
        }

        await helper.form.waitForToast('Job Accepted!');
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[PASS] Job Accepted');

        // 5. Client Funds Job (to move to In Progress)
        console.log('--- Step 5: JG Funds Job ---');
        await helper.auth.logout();
        await helper.auth.login(TEST_ACCOUNTS.client.email, TEST_ACCOUNTS.client.password);
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('proceed-payment-button').click();

        // Bypass payment using shim
        await page.waitForFunction(() => (window as any).e2e_directFundJob !== undefined);
        await page.evaluate(async () => {
            await (window as any).e2e_directFundJob();
        });
        await helper.form.waitForToast('Test Mode: Payment Initiated');

        // Reload to see status
        await page.waitForTimeout(2000);
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');
        console.log('[PASS] Job Funded, Status: In Progress');
        await helper.auth.logout();

        // 6. Professional Proposes Variation
        await helper.auth.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password);
        await helper.auth.ensureRole('Professional');
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.click('[data-testid="propose-variation-button"]');
        await page.fill('textarea', 'Extra Copper Wiring');
        await page.fill('input[type="number"]', '150');
        await page.click('button:has-text("Send Proposal")');

        // Check for toast (optional/relaxed) and verify data persistence
        await expect(page.locator('text=Variation Proposed').first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=Extra Copper Wiring')).toBeVisible();
        await expect(page.locator('text=QUOTED')).toBeVisible();
        await helper.auth.logout();

        // 6. Client Pays
        await helper.auth.login(TEST_ACCOUNTS.client.email, TEST_ACCOUNTS.client.password);
        await page.goto(`/dashboard/jobs/${jobId}`);

        page.once('dialog', dialog => dialog.accept());

        // Find Approve & Pay button in the list
        const approveBtn = page.locator('button:has-text("Approve & Pay")');
        await approveBtn.waitFor({ state: 'visible', timeout: 30000 });
        await page.waitForTimeout(2000); // Wait for React hydration
        await approveBtn.click();
        await helper.form.waitForToast('Test Mode: Variation Payment Initiated');
        console.log('[PASS] Variation Payment Initiated');
    });
});


