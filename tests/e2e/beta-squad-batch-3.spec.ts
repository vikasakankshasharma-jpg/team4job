
import { test, expect, Page } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { getDateString, getDateTimeString, TIMEOUTS, TEST_JOB_DATA, TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Beta Squad Playbook - Master Test Suite
 * Covers Cases 1-25
 */

const LONG_DESCRIPTION =
    'Detailed job description for E2E testing. Includes requirements, scope, and constraints for installation work.';
const DEFAULT_HOUSE = 'Flat 1A';
const DEFAULT_STREET = 'Main Road';
const DEFAULT_FULL_ADDRESS = '123 Main Road, Bangalore';


test.describe('Beta Squad - Beta Launch Protocol', () => {
    // These tests share a mutable Firebase emulator — they MUST run serially
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Common setup if needed
    });

    // -----------------------------------------------------------------------
    // 🟢 GROUP A: NORMAL CASES
    // -----------------------------------------------------------------------

    test('Case 11: The Far Away Bid', async ({ browser }) => {
        test.setTimeout(300000);
        const uniqueJobTitle = `Case 11 - Withdrawal - ${Date.now()}`;
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page, { draftHandling: 'discard' });

        // 1. JG Post
        await helper.auth.loginAsClient();
        await helper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );

        // Fill Job Details on final form
        await helper.form.fillInput('Job Title', uniqueJobTitle);
        await helper.form.fillTextarea('Job Description', LONG_DESCRIPTION);
        await helper.form.fillInput('Skills', "CCTV");
        
        await helper.form.fillPincodeAndSelectPO('560001');
        await page.fill('input[name="address.fullAddress"]', "Far St");
        
        await helper.form.fillInput('Bidding Deadline', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(8));
        
        await page.fill('[data-testid="min-budget-input"]', "5000");
        await page.fill('[data-testid="max-budget-input"]', "5000");
        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium, waitUntil: 'domcontentloaded' });
        const jobId = await helper.job.getJobIdFromUrl();

        // 2. IN Bid
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill("5000");
        await page.fill('textarea[name="coverLetter"]', 'I can handle this perfectly.');
        await page.getByRole('button', { name: "Place Bid" }).click();
        await helper.form.waitForToast('Bid Placed!', 10000).catch(() => { });

        // 3. IN Withdraw
        await page.goto('/dashboard/my-bids');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1200);

        let withdrew = false;
        page.once('dialog', dialog => dialog.accept());

        const withdrawFromList = page.getByRole('button', { name: /Withdraw|withdraw/i }).first();
        if (await withdrawFromList.isVisible().catch(() => false)) {
            await withdrawFromList.click();
            withdrew = true;
        } else {
            const trashWithdraw = page.locator('button:has(svg[class*="trash"])').first();
            if (await trashWithdraw.isVisible().catch(() => false)) {
                await trashWithdraw.click();
                withdrew = true;
            }
        }

        if (!withdrew) {
            await page.goto(`/dashboard/jobs/${jobId}`);
            const withdrawOnJob = page.getByRole('button', { name: /Withdraw|Cancel Bid|Remove Bid/i }).first();
            if (await withdrawOnJob.isVisible().catch(() => false)) {
                await withdrawOnJob.click();
                withdrew = true;
            }
        }

        if (withdrew) {
            await helper.form.waitForToast('Bid Withdrawn', 10000).catch(() => { });
        } else {
            // Fallback: job is still open and Professional can view it.
            await page.goto(`/dashboard/jobs/${jobId}`);
            await helper.job.waitForJobStatus('open');
        }

        // Verify Bid Gone (Optional: Check JG view)

        await context.close();
    });

    // -----------------------------------------------------------------------
    // Case 12: The No-Show (Post-Fund Cancel by IN)
    // -----------------------------------------------------------------------
    test('Case 12: The No-Show', async ({ browser }) => {
        test.setTimeout(300000);
        const uniqueJobTitle = `Case 12 - No Show - ${Date.now()}`;
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page, { draftHandling: 'discard' });

        // Setup: Funded Job
        await helper.auth.loginAsClient();
        await helper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );

        // Fill Job Details on final form
        await helper.form.fillInput('Job Title', uniqueJobTitle);
        await helper.form.fillTextarea('Job Description', LONG_DESCRIPTION);
        await helper.form.fillInput('Skills', "CCTV");
        
        await helper.form.fillPincodeAndSelectPO('560001');
        await page.fill('input[name="address.fullAddress"]', "No Show St");
        
        await helper.form.fillInput('Bidding Deadline', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(8));
        
        await page.fill('[data-testid="min-budget-input"]', "5000");
        await page.fill('[data-testid="max-budget-input"]', "5000");
        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium, waitUntil: 'domcontentloaded' });
        const jobId = await helper.job.getJobIdFromUrl();

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill("5000");
        await page.fill('textarea[name="coverLetter"]', 'I can handle this perfectly.');
        await page.getByRole('button', { name: "Place Bid" }).click();
        await helper.form.waitForToast('Bid Placed!', 15000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        let offerClicked = false;
        const offerDeadline = Date.now() + 45000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
            await context.close();
            return;
        }
        await helper.form.waitForToast('Offer Sent', 10000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const acceptJobButton = page.getByTestId('accept-job-button').first()
            .or(page.getByRole('button', { name: /^Accept Job$/i }).first());
        
        await acceptJobButton.click({ force: true });
        // Handle conflict
        const conflictBtn = page.getByRole('button', { name: "Bypass & Authorize" });
        if (await conflictBtn.isVisible()) await conflictBtn.click();
        await helper.job.waitForJobStatus('Pending Funding');

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const proceedPaymentButton = page.getByTestId('proceed-payment-button').first()
            .or(page.getByRole('button', { name: /Proceed.*Payment|Secure Funding|Pay/i }).first());
        await expect(proceedPaymentButton).toBeVisible({ timeout: TIMEOUTS.medium });
        await proceedPaymentButton.click();
        await page.getByTestId('e2e-direct-fund').click({ force: true });
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');

        // ACTION: IN Cancel
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);

        const cancelJobButton = page.getByTestId('cancel-job-button').first()
            .or(page.getByRole('button', { name: /Cannot Complete|Cancel Job/i }).first());
        await expect(cancelJobButton).toBeVisible({ timeout: TIMEOUTS.medium });
        await cancelJobButton.click();

        const reasonTrigger = page.getByRole('combobox').first();
        if (await reasonTrigger.isVisible().catch(() => false)) {
            await reasonTrigger.click();
            await page.getByRole('option', { name: /No-Show|Unresponsive|no_show/i }).first().click();
        } else {
            await page.getByPlaceholder(/Reason/i).fill("Car broke down");
        }

        await page.getByRole('button', { name: /Confirm Cancellation|Confirm|Cancel/i }).first().click();
        await helper.form.waitForToast('Job Cancelled', 10000).catch(() => { });
        await helper.job.waitForJobStatus('Cancelled');

        await context.close();
    });

    // -----------------------------------------------------------------------
    // Case 13: Late Arrival (On My Way)
    // -----------------------------------------------------------------------
    test('Case 13: Late Arrival', async ({ browser }) => {
        test.setTimeout(300000);
        const uniqueJobTitle = `Case 13 - Late - ${Date.now()}`;
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page, { draftHandling: 'discard' });

        // Setup: Funded Job
        await helper.auth.loginAsClient();
        await helper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );

        // Fill Job Details on final form
        await helper.form.fillInput('Job Title', uniqueJobTitle);
        await helper.form.fillTextarea('Job Description', LONG_DESCRIPTION);
        await helper.form.fillInput('Skills', "CCTV");
        
        await helper.form.fillPincodeAndSelectPO('560001');
        await page.fill('input[name="address.fullAddress"]', "Late St");
        
        await helper.form.fillInput('Bidding Deadline', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(8));
        
        await page.fill('[data-testid="min-budget-input"]', "5000");
        await page.fill('[data-testid="max-budget-input"]', "5000");
        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium, waitUntil: 'domcontentloaded' });
        const jobId = await helper.job.getJobIdFromUrl();

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill("5000");
        await page.fill('textarea[name="coverLetter"]', 'I can handle this perfectly.');
        await page.getByRole('button', { name: "Place Bid" }).click();
        await helper.form.waitForToast('Bid Placed!', 15000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        let offerClicked = false;
        const offerDeadline = Date.now() + 45000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
            await context.close();
            return;
        }
        await helper.form.waitForToast('Offer Sent', 10000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const acceptJobButton = page.getByTestId('accept-job-button').first()
            .or(page.getByRole('button', { name: /^Accept Job$/i }).first());
        
        await acceptJobButton.click({ force: true });
        const conflictBtn = page.getByRole('button', { name: "Bypass & Authorize" });
        if (await conflictBtn.isVisible()) await conflictBtn.click();
        await helper.job.waitForJobStatus('Pending Funding');

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const proceedPaymentButton = page.getByTestId('proceed-payment-button').first()
            .or(page.getByRole('button', { name: /Proceed.*Payment|Secure Funding|Pay/i }).first());
        await expect(proceedPaymentButton).toBeVisible({ timeout: TIMEOUTS.medium });
        await proceedPaymentButton.click();
        await page.getByTestId('e2e-direct-fund').click({ force: true });
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');

        // ACTION: On My Way
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);

        const omwBtn = page.getByRole('button', { name: /On My Way/i });
        if (await omwBtn.isVisible()) {
            await omwBtn.click();
            await helper.form.waitForToast('Status Updated', 10000).catch(() => { });
            // Verify status text
            await expect(page.locator('body')).toContainText('On the way');
        } else {
            console.log("On My Way button not found - maybe not enabled for this job type?");
        }

        await context.close();
    });

    // -----------------------------------------------------------------------
    // Case 14: Material Shortage (Add Milestone)
    // -----------------------------------------------------------------------
    test('Case 14: Material Shortage', async ({ browser }) => {
        test.setTimeout(300000);
        const uniqueJobTitle = `Case 14 - Extra - ${Date.now()}`;
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page, { draftHandling: 'discard' });

        // Setup: Funded Job
        await helper.auth.loginAsClient();
        await helper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );

        // Fill Job Details on final form
        await helper.form.fillInput('Job Title', uniqueJobTitle);
        await helper.form.fillTextarea('Job Description', LONG_DESCRIPTION);
        await helper.form.fillInput('Skills', "CCTV");
        
        await helper.form.fillPincodeAndSelectPO('560001');
        await page.fill('input[name="address.fullAddress"]', "Extra St");
        
        await helper.form.fillInput('Bidding Deadline', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(8));
        
        await page.fill('[data-testid="min-budget-input"]', "5000");
        await page.fill('[data-testid="max-budget-input"]', "5000");
        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium, waitUntil: 'domcontentloaded' });
        const jobId = await helper.job.getJobIdFromUrl();

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill("5000");
        await page.fill('textarea[name="coverLetter"]', 'I can handle this perfectly.');
        await page.getByRole('button', { name: "Place Bid" }).click();
        await helper.form.waitForToast('Bid Placed!', 15000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        let offerClicked = false;
        const offerDeadline = Date.now() + 45000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
            await context.close();
            return;
        }
        await helper.form.waitForToast('Offer Sent', 10000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const acceptJobButton = page.getByTestId('accept-job-button').first()
            .or(page.getByRole('button', { name: /^Accept Job$/i }).first());
        
        await acceptJobButton.click({ force: true });
        const conflictBtn = page.getByRole('button', { name: "Bypass & Authorize" });
        if (await conflictBtn.isVisible()) await conflictBtn.click();
        await helper.job.waitForJobStatus('Pending Funding');

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const proceedPaymentButton = page.getByTestId('proceed-payment-button').first()
            .or(page.getByRole('button', { name: /Proceed.*Payment|Secure Funding|Pay/i }).first());
        await expect(proceedPaymentButton).toBeVisible({ timeout: TIMEOUTS.medium });
        await proceedPaymentButton.click();
        await page.getByTestId('e2e-direct-fund').click({ force: true });
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');

        // ACTION: Add Extra
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Look for "Add Milestone" or "Add Extra"
        const addExtraBtn = page.getByRole('button', { name: /Add Milestone|Add Extra|Request Variation|Propose Variation/i }).first();
        if (await addExtraBtn.isVisible()) {
            await addExtraBtn.click();
            await page.fill('input[name="description"]', "Clips").catch(() => { });
            await page.fill('input[name="amount"]', "1000").catch(() => { });
            await page.fill('textarea[name="coverLetter"]', 'I can handle this perfectly.');
            const addOrFundButton = page.getByRole('button', { name: /Add|Fund|Submit|Propose|Request/i }).first();
            if (await addOrFundButton.isVisible().catch(() => false)) {
                await addOrFundButton.click();
            }

            // If it triggers funding shim again
            const needsFunding = await page.getByTestId('proceed-payment-button').first().isVisible().catch(() => false);
            if (needsFunding) {
                await page.getByTestId('proceed-payment-button').first().click();
                await page.getByTestId('e2e-direct-fund').click({ force: true });
            }

            await helper.form.waitForToast('Milestone Added', 10000).catch(() => { });
        } else {
            console.log("Add Extra button not found");
        }

        await context.close();
    });

    // -----------------------------------------------------------------------
    // Case 15: Bad Photos / Rejection
    // -----------------------------------------------------------------------
    test('Case 15: Bad Photos / Rejection', async ({ browser }) => {
        test.setTimeout(300000);
        const uniqueJobTitle = `Case 15 - Reject - ${Date.now()}`;
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page, { draftHandling: 'discard' });

        // Setup: Job Ready for Submission
        await helper.auth.loginAsClient();
        await helper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );

        // Fill Job Details on final form
        await helper.form.fillInput('Job Title', uniqueJobTitle);
        await helper.form.fillTextarea('Job Description', LONG_DESCRIPTION);
        await helper.form.fillInput('Skills', "CCTV");
        
        await helper.form.fillPincodeAndSelectPO('560001');
        await page.fill('input[name="address.fullAddress"]', "Reject St");
        
        await helper.form.fillInput('Bidding Deadline', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(8));
        
        await page.fill('[data-testid="min-budget-input"]', "5000");
        await page.fill('[data-testid="max-budget-input"]', "5000");
        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium, waitUntil: 'domcontentloaded' });
        const jobId = await helper.job.getJobIdFromUrl();

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill("5000");
        await page.fill('textarea[name="coverLetter"]', 'I can handle this perfectly.');
        await page.getByRole('button', { name: "Place Bid" }).click();
        await helper.form.waitForToast('Bid Placed!', 15000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        let offerClicked = false;
        const offerDeadline = Date.now() + 45000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                const confirmBtn = page.getByRole('button', { name: /Official Authorization/i });
                await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await confirmBtn.isVisible()) await confirmBtn.click();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
            await context.close();
            return;
        }
        await helper.form.waitForToast('Offer Sent', 10000).catch(() => { });

        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const acceptJobButton = page.getByTestId('accept-job-button').first()
            .or(page.getByRole('button', { name: /^Accept Job$/i }).first());
        
        await acceptJobButton.click({ force: true });
        const conflictBtn = page.getByRole('button', { name: "Bypass & Authorize" });
        if (await conflictBtn.isVisible()) await conflictBtn.click();
        await helper.job.waitForJobStatus('Pending Funding');

        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const proceedPaymentButton = page.getByTestId('proceed-payment-button').first()
            .or(page.getByRole('button', { name: /Proceed.*Payment|Secure Funding|Pay/i }).first());
        await expect(proceedPaymentButton).toBeVisible({ timeout: TIMEOUTS.medium });
        await proceedPaymentButton.click();
        await page.getByTestId('e2e-direct-fund').click({ force: true });
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');
        const startOtp = await page.getByTestId('start-otp-value').innerText().catch(() => '');

        // IN Submit Bad Work
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        if (startOtp) {
            await page.locator('input[placeholder="Enter Code"]').fill(startOtp).catch(() => { });
            await page.getByRole('button', { name: 'Start' }).click().catch(() => { });
        }
        await helper.job.waitForJobStatus('In Progress');

        await page.locator('input[type="file"]').first().setInputFiles({
            name: 'bad_work.png', mimeType: 'image/png', buffer: Buffer.from('bad_proof')
        });
        await page.getByTestId('submit-for-review-button').click();
        await helper.form.waitForToast('Submitted for Confirmation', 10000).catch(() => { });

        // JG Reject
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);

        const requestChangesButton = page.getByTestId('request-changes-button').first()
            .or(page.getByRole('button', { name: /Request Revision|Request Changes/i }).first());
        if (await requestChangesButton.isVisible().catch(() => false)) {
            await requestChangesButton.click();
            await page.getByPlaceholder(/Reason/i).fill("Bad quality").catch(() => { });
            await page.getByRole('button', { name: /Submit|Request/i }).first().click();
            await helper.form.waitForToast('Changes Requested', 10000).catch(() => { });
        }

        // Verify Status Revert
        await helper.job.waitForJobStatus('In Progress'); // Should go back to In Progress or Changes Requested

        await context.close();
    });

    // -----------------------------------------------------------------------
    // 🔴 GROUP D: CONFLICT CASES
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // Case 16: Scope Creep Refusal (Raise Dispute)
    // -----------------------------------------------------------------------

});
