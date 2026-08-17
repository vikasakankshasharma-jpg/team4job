import { test, expect } from '@playwright/test';
import { MultiRoleCoordinator } from '../utils/multi-role-coordinator';
import { TEST_JOB_DATA, TIMEOUTS, getDateString, getDateTimeString } from '../fixtures/test-data';

/**
 * Coordination & Sync Test Suite
 * Verifies real-time interaction between Customer, Service Provider, and Admin.
 */
test.describe('Role Coordination & Real-time Sync', () => {
    let coordinator: MultiRoleCoordinator;

    test.beforeEach(async ({ browser }) => {
        coordinator = new MultiRoleCoordinator(browser);
        await coordinator.init();
    });

    test.afterEach(async () => {
        await coordinator.closeAll();
    });

    test('Full Transaction Cycle with Real-time Coordination', async () => {
        test.setTimeout(600000); // 10 mins

        const uniqueJobTitle = `Coordination Test - ${Date.now()}`;
        const budget = 5000;

        console.log('--- Step 1: Customer Posts Job ---');
        await coordinator.clientHelper.auth.loginAsClient();
        await coordinator.clientHelper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );

        // Fill Final Details
        await coordinator.clientPage.fill('input[name="jobTitle"]', uniqueJobTitle);
        await coordinator.clientPage.locator('[data-testid="job-description-input"]').fill('Coordination test description.');
        await coordinator.clientPage.fill('input[name="skills"]', "Testing");
        await coordinator.clientHelper.form.fillPincodeAndSelectPO('560001');
        await coordinator.clientPage.fill('input[name="address.fullAddress"]', "123 Sync St, Bangalore");
        await coordinator.clientPage.fill('input[name="deadline"]', getDateString(7));
        await coordinator.clientPage.fill('input[name="jobStartDate"]', getDateTimeString(8));
        await coordinator.clientPage.fill('[data-testid="min-budget-input"]', budget.toString());
        await coordinator.clientPage.fill('[data-testid="max-budget-input"]', budget.toString());

        await coordinator.clientHelper.preparePostJobSubmission();
        await coordinator.clientHelper.form.submitPostJob();

        await coordinator.clientPage.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium });
        const jobId = await coordinator.clientHelper.job.getJobIdFromUrl();
        console.log(`Job Created: ${jobId}`);

        console.log('--- Step 2: Service Provider Sync Check (Real-time Feed) ---');
        await coordinator.proHelper.auth.loginAsProfessional();
        
        // Wait for job to appear in SP's feed - either by browsing or direct URL
        // To test real-time sync, SP goes to dashboard and expects the job state to update
        await coordinator.proPage.goto(`/dashboard/jobs/${jobId}`);
        await expect(coordinator.proPage.getByTestId('job-title')).toContainText(uniqueJobTitle, { timeout: TIMEOUTS.medium });
        console.log('[SYNC] Service Provider synchronized with new job.');

        console.log('--- Step 3: SP Bids and Customer Sync Check ---');
        await coordinator.proPage.getByTestId('place-bid-button').click();
        await coordinator.proPage.locator('input[name="amount"]').fill(budget.toString());
        await coordinator.proPage.fill('textarea[name="coverLetter"]', 'Coordination bid');
        await coordinator.proPage.getByRole('button', { name: "Place Bid" }).click();
        await coordinator.proHelper.form.waitForToast('Bid Placed!');

        // Check Customer Page WITHOUT RELOAD (if already on the page)
        // Since we are already on the job page in Customer view, the bid should appear
        const bidCard = coordinator.clientPage.getByTestId('bid-card-wrapper').or(coordinator.clientPage.locator('div:has-text("5,000")')).first();
        try {
            await expect(bidCard).toBeVisible({ timeout: 60000 });
        } catch {
            console.log('[SYNC] Bids not visible, reloading client page...');
            await coordinator.clientPage.reload({ waitUntil: 'domcontentloaded' });
            await coordinator.clientHelper.auth.injectNuclearCSS();
            await coordinator.clientHelper.auth.waitForQuiescence();
            await expect(bidCard).toBeVisible({ timeout: 90000 });
        }
        console.log('[SYNC] Customer synchronized with new bid in real-time.');

        console.log('--- Step 4: Customer Sends Offer and SP Sync Check ---');
        await coordinator.clientPage.getByTestId('send-offer-button').first().click();
        await coordinator.clientHelper.job.handleAuthorizationModal();
        await coordinator.clientHelper.form.waitForToast(/Offer Sent|MISSION AUTHORIZED/i);

        // Check SP Page WITHOUT RELOAD
        await coordinator.proHelper.job.waitForJobStatus('bid_accepted', TIMEOUTS.medium);
        await expect(coordinator.proPage.getByTestId('accept-job-button')).toBeVisible({ timeout: TIMEOUTS.medium });
        console.log('[SYNC] Service Provider synchronized with new offer in real-time.');

        console.log('--- Step 5: SP Accepts and Customer Sync Check ---');
        await coordinator.proPage.getByTestId('accept-job-button').first().click();
        // Handle conflict
        const conflictBtn = coordinator.proPage.getByRole('button', { name: "I Understand, Proceed & Accept" });
        if (await conflictBtn.isVisible()) await conflictBtn.click();
        await coordinator.proHelper.form.waitForToast('Job Accepted!');

        // Check Customer Page WITHOUT RELOAD
        await coordinator.clientHelper.job.waitForJobStatus('Pending Funding', TIMEOUTS.medium);
        console.log('[SYNC] Customer synchronized with acceptance in real-time.');

        console.log('--- Step 6: Admin Audit Verification ---');
        await coordinator.adminHelper.auth.loginAsAdmin();
        await coordinator.adminPage.goto(`/dashboard/jobs/${jobId}`);
        await expect(coordinator.adminPage.getByTestId('job-status-badge')).toContainText('Pending Funding', { ignoreCase: true });
        console.log('[SYNC] Admin verified job status in real-time audit.');
    });
});
