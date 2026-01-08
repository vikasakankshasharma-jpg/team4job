
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

test.describe('Secured Variation Orders', () => {

    // Shared Data
    let jobId: string;
    const installerEmail = 'installer_variation@example.com';
    const jobGiverEmail = 'giver_variation@example.com';

    test('Full Variation Order Cycle', async ({ page }) => {
        test.setTimeout(120000); // 2 minutes
        const helper = new TestHelper(page);

        // 1. Job Giver Creates Job
        await helper.auth.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await helper.nav.goToPostJob();
        await helper.form.fillInput('Job Title', 'Variation Test Job ' + Date.now());
        await helper.form.fillTextarea('Job Description', 'A simple job for testing variations. Must be at least 50 chars long to pass validation.');
        await helper.form.fillPincodeAndSelectPO('110001'); // Delhi
        await helper.form.selectDropdown('Category', 'New Installation'); // Valid category
        // Use simpler labels that partial match works better with, or are exact matches on the form
        await helper.form.fillInput('Required Skills', 'Cabling, Drilling');

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
        await page.click('button:has-text("Post Job")');
        // Toast might be missed due to rapid redirect, so wait for URL
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/);

        jobId = await helper.job.getJobIdFromUrl();
        console.log(`Created Job: ${jobId}`);
        expect(jobId).toBeTruthy();

        // 2. Installer Bids
        await helper.auth.login(TEST_ACCOUNTS.installer.email, TEST_ACCOUNTS.installer.password);
        await helper.auth.ensureRole('Installer');

        // Wait for potential redirects/auth settlement
        await page.waitForTimeout(2000);

        console.log(`Installer navigating to job: /dashboard/jobs/${jobId}`);
        await page.goto(`/dashboard/jobs/${jobId}`);
        // Role already ensured
        // await helper.auth.ensureRole('Installer'); 

        await page.click('button:has-text("Place Bid")');
        await page.fill('input[name="bidAmount"]', '500');
        await page.fill('textarea[name="coverLetter"]', 'I am the best installer for this job.');
        await page.click('div[role="dialog"] button:has-text("Place Bid")');
        await expect(page.locator('text=Bid Placed')).toBeVisible();
        await helper.auth.logout();

        // 3. Job Giver Awards
        await helper.auth.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.click('button:has-text("Send Offer")');
        // Toast might be flaky, check persistent state
        await expect(page.locator('text=You have sent an offer')).toBeVisible();
        await helper.auth.logout();

        // 4. Installer Accepts
        await helper.auth.login(TEST_ACCOUNTS.installer.email, TEST_ACCOUNTS.installer.password);
        await helper.auth.ensureRole('Installer');
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.click('button:has-text("Accept Job")');

        // Handle potential conflict dialog (Robustly)
        const conflictDialog = page.locator('text=Availability Conflict Detected');
        try {
            await conflictDialog.waitFor({ state: 'visible', timeout: 8000 });
            await page.click('button:has-text("Confirm & Auto-Decline")');
            await conflictDialog.waitFor({ state: 'hidden' });
        } catch (e) {
            // Dialog didn't appear, proceed
        }

        await page.waitForTimeout(2000); // Wait for potential conflict handling to settle
        await helper.auth.logout();

        // 5. Job Giver Funds Job (to move to In Progress)
        await helper.auth.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Wait for component to mount and shim to attach
        await expect(page.locator('[data-testid="job-title"]')).toBeVisible();
        await page.waitForFunction(() => !!(window as any).e2e_directFundJob);

        // Use Shim to Fund
        console.log('Funding Job via Shim...');
        await page.evaluate(() => (window as any).e2e_directFundJob());
        await expect(page.locator('[data-status="In Progress"]')).toBeVisible({ timeout: 20000 });
        await helper.auth.logout();

        // 6. Installer Proposes Variation
        await helper.auth.login(TEST_ACCOUNTS.installer.email, TEST_ACCOUNTS.installer.password);
        await helper.auth.ensureRole('Installer');
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.click('[data-testid="propose-variation-button"]');
        await page.fill('textarea', 'Extra Copper Wiring');
        await page.fill('input[type="number"]', '150');
        await page.click('button:has-text("Send Proposal")');

        await expect(page.locator('text=Variation Proposed')).toBeVisible();
        await expect(page.locator('text=Extra Copper Wiring')).toBeVisible();
        await expect(page.locator('text=QUOTED')).toBeVisible();
        await helper.auth.logout();

        // 6. Job Giver Pays
        await helper.auth.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await page.goto(`/dashboard/jobs/${jobId}`);

        const paymentPromise = page.waitForResponse(response =>
            response.url().includes('/api/escrow/add-funds') && response.status() === 200
        );
        page.on('dialog', dialog => dialog.accept());

        // Find Approve & Pay button in the list
        // It should be inside the card for this specific task.
        // Since we only have one, we can find by text.
        await page.click('button:has-text("Approve & Pay")');

        const response = await paymentPromise;
        const body = await response.json();
        expect(body.payment_session_id).toBeTruthy();
        console.log('Payment Initiated:', body);
    });
});

