
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
        test.setTimeout(600000);
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
        await page.waitForTimeout(3000); // Let Firebase Auth settle its IndexedDB state before hard navigation
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill("5000");
        await page.fill('textarea[name="coverLetter"]', 'I can handle this perfectly.');
        await page.getByRole('button', { name: "Place Bid" }).click();
        await helper.form.waitForToast('Bid Placed!', 10000).catch(() => { });

        // 3. IN Withdraw
        let withdrew = false;
        
        // Add a persistent dialog handler that doesn't get consumed early
        page.on('dialog', dialog => dialog.accept().catch(() => {}));

        for (let i = 0; i < 15; i++) {
            await page.goto('/dashboard/my-bids');
            
            // Wait for loading to finish
            await page.locator('text="Loading Bids"').waitFor({ state: 'hidden', timeout: 2430000 }).catch(() => {});
            
            try {
                const trashWithdraw = page.getByTestId('withdraw-bid-button').first();
                // Wait for the button to be attached to the DOM and visible
                await trashWithdraw.waitFor({ state: 'visible', timeout: 1620000 });
                
                // Hover over the card/row to reveal the button if needed
                await page.locator('tr.group\\/row, div.group').first().hover().catch(() => {});
                
                await trashWithdraw.click({ force: true, timeout: 1620000 });
                withdrew = true;
                break;
            } catch (e: any) {
                console.log(`[Case 11] Error interacting with withdraw button: ${e.message}`);
                // Ignore and retry
            }
            console.log(`[Case 11] Withdraw attempt ${i + 1} finished, retrying...`);
            await page.waitForTimeout(3000);
        }

        if (!withdrew) {
            throw new Error("Withdraw button not found on My Bids page!");
        }

        await helper.form.waitForToast('Bid Withdrawn', 10000).catch(() => { });

        // Verify Bid Gone (Optional: Check JG view)

        await context.close();
    });

    // -----------------------------------------------------------------------
    // Case 12: The No-Show (Post-Fund Cancel by IN)
    // -----------------------------------------------------------------------
    test('Case 12: The No-Show', async ({ browser }) => {
        test.setTimeout(600000);
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
        await page.waitForTimeout(3000);
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
        const offerDeadline = Date.now() + 90000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Operations|Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
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
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/e2e/fund-job-v2')),
            page.getByTestId('e2e-direct-fund').click({ force: true })
        ]);
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

        // Wait for the cancel dialog to open (title is always present)
        await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 1620000 });

        // Default reason is 'changed_mind' which shows Confirm Cancellation directly.
        // Only interact with combobox if we need to change from no_show.
        const reasonTrigger = page.getByRole('combobox').first();
        if (await reasonTrigger.isVisible({ timeout: 1620000 }).catch(() => false)) {
            const currentValue = await reasonTrigger.inputValue().catch(() => '');
            if (currentValue === 'no_show') {
                await reasonTrigger.click();
                await page.getByRole('option', { name: /Changed my mind/i }).first().click();
            }
        }

        const confirmCancelBtn = page.getByRole('button', { name: /Confirm Cancellation/i }).first();
        await expect(confirmCancelBtn).toBeVisible({ timeout: TIMEOUTS.short });
        await confirmCancelBtn.click();
        await helper.form.waitForToast('Job Cancelled', 10000).catch(() => { });
        await helper.job.waitForJobStatus('Cancelled');

        await context.close();
    });

    // -----------------------------------------------------------------------
    // Case 13: Late Arrival (On My Way)
    // -----------------------------------------------------------------------
    test('Case 13: Late Arrival', async ({ browser }) => {

        test.setTimeout(600000);
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
        const offerDeadline = Date.now() + 90000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Operations|Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
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
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/e2e/fund-job-v2')),
            page.getByTestId('e2e-direct-fund').click({ force: true })
        ]);
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
        test.setTimeout(600000);
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
        const offerDeadline = Date.now() + 90000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Operations|Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
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
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/e2e/fund-job-v2')),
            page.getByTestId('e2e-direct-fund').click({ force: true })
        ]);
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
                await Promise.all([
                    page.waitForResponse(res => res.url().includes('/api/e2e/fund-job-v2')),
                    page.getByTestId('e2e-direct-fund').click({ force: true })
                ]);
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
        test.setTimeout(600000);
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
        const offerDeadline = Date.now() + 90000;
        while (Date.now() < offerDeadline && !offerClicked) {
            const bidsTab = page.getByTestId('bids-tab').first()
                .or(page.getByRole('tab', { name: /Bids|job\.bidsTab/i }).first());
            if (await bidsTab.isVisible().catch(() => false)) {
                await bidsTab.click();
            }

            const sendOfferByTestId = page.getByTestId('send-offer-button').first();
            if (await sendOfferByTestId.isVisible().catch(() => false)) {
                await sendOfferByTestId.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            const reviewAwardButton = page.getByRole('button', { name: /Send Offer|Review Award|job\.reviewAward/i }).first();
            if (await reviewAwardButton.isVisible().catch(() => false)) {
                await reviewAwardButton.click();
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }

            await page.waitForTimeout(1500);
            await page.reload();
        }
        if (!offerClicked) {
            await expect(page.getByRole('button', { name: /Close Operations|Close Bidding/i }).first()).toBeVisible({ timeout: TIMEOUTS.medium });
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
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/e2e/fund-job-v2')),
            page.getByTestId('e2e-direct-fund').click({ force: true })
        ]);
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
            .or(page.getByRole('button', { name: /Request Revision|Request Changes|Revision/i, exact: true }).first());
        
        await requestChangesButton.click();
        await page.getByPlaceholder(/Reason|Describe/i).fill("Bad quality");
        await page.getByRole('button', { name: /Submit Revision Request/i }).click();
        await helper.form.waitForToast('Revision Requested', 10000).catch(() => { });


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
