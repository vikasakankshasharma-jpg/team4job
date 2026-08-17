import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

/** 
 * Dispute & Refund Master Audit
 * Covers Case 0: Formal Dispute, Admin Mediation, and Full Refund.
 * Serial mode ensures that seeded data persists across roles.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Dispute & Refund Master Audit', () => {
    let jobId: string;
    let startOtp: string;
    let disputeId: string;

    test.beforeAll(async ({ browser }) => {
        // Ensure emulator is clean - assumes 'scenario:audit-ready' was run before
        console.log('--- SYSTEM: Dispute Audit Initializing ---');
    });

    test('Act 1: Job Setup & Conflict Trigger', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 1: Conflict Initiation ---');

        // Professional Login (Amit Pro)
        await helper.auth.loginAsProfessional();
        
        // Post Job (Vijay Client) - We'll follow a simplified version of Act 2 from the main audit
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        
        await helper.form.completeWizard(
            'Security & Surveillance',
            'CCTV / Video Surveillance',
            [
                '1-2 Points', 
                'Indoor Only', 
                'Commercial / Office', 
                'No, needs fresh wiring', 
                '1 Week', 
                'Not needed',
                'Mobile viewing only'
            ],
            'Within 1-2 Days'
        );
        await page.fill('[data-testid="min-budget-input"]', "5000");
        await page.fill('[data-testid="max-budget-input"]', "10000");
        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: 4860000 });
        
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`Job Created: ${jobId}`);

        // Professional Bidding (Amit Pro)
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill('5000');
        await page.fill('textarea[name="coverLetter"]', 'I will do a "great" job.');
        await page.getByRole('button', { name: /Place Bid/i }).click();
        await helper.form.waitForToast('Bid Placed!');

        // Client Awards Offer
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        
        // Wait for bids to load via Firestore real-time subscription (and click tab)
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
                await helper.job.handleAuthorizationModal();
                offerClicked = true;
                break;
            }
            await page.waitForTimeout(2000);
        }
        if (!offerClicked) throw new Error("Could not find/click send-offer button");
        await helper.form.waitForToast('Offer Sent').catch(() => {});
        await page.waitForTimeout(2000); // Wait for background triggers
        
        // Professional Accept
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const acceptJobButton = page.getByTestId('accept-job-button').first()
            .or(page.getByRole('button', { name: /^Accept Job$/i }).first());
        await acceptJobButton.click({ force: true });
        const conflictBtn = page.getByRole('button', { name: "Bypass & Authorize" });
        if (await conflictBtn.isVisible().catch(() => false)) await conflictBtn.click();
        await helper.job.waitForJobStatus('Pending Funding');
        
        // Client Fund
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        const proceedPaymentButton = page.getByTestId('proceed-payment-button').first()
            .or(page.getByRole('button', { name: /Proceed.*Payment|Secure Funding|Pay/i }).first());
        await expect(proceedPaymentButton).toBeVisible({ timeout: 1620000 });
        await proceedPaymentButton.click();
        await page.getByTestId('e2e-direct-fund').click({ force: true });
        await page.waitForTimeout(2000);
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');
        startOtp = await page.getByTestId('start-otp-value').innerText();

        // Professional Start & Submit unsatisfactory work
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.locator('input[placeholder="Enter Code"]').fill(startOtp);
        await page.locator('button:has-text("Start"), button[data-testid="start-job-btn"]').first().click();
        
        await page.locator('input[type="file"]').first().setInputFiles({
            name: 'poor_work.png', mimeType: 'image/png', buffer: Buffer.from('poor')
        });
        await page.getByTestId('submit-for-review-button').click();
        await helper.job.waitForJobStatus('Pending Confirmation');

        console.log('✅ Act 1 Complete: Job in Conflict State.');
    });

    test('Act 2: Raising Formal Dispute', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 2: Client Raises Dispute ---');

        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        try {
            await expect(page.getByTestId('job-status-badge')).toContainText(/Pending Confirmation/i, { timeout: 1620000 });
        } catch (e) {
            console.log('[INFO] Act 2: Status not updated to Pending Confirmation yet. Reloading page...');
            await page.reload();
            await expect(page.getByTestId('job-status-badge')).toContainText(/Pending Confirmation/i, { timeout: 2430000 });
        }

        // Raise Dispute via the UI
        const disputeButton = page.getByTestId('dispute-button').first()
            .or(page.getByRole('button', { name: /Raise Dispute|Dispute|Report Issue|Flag Discrepancy/i }).first());
        await expect(disputeButton).toBeVisible({ timeout: 1620000 });
        await disputeButton.click();
        await page.getByPlaceholder(/Explain the issue/i).fill('The professional only installed 2 cameras instead of 8. I want a full refund.');
        await page.getByRole('button', { name: /Submit Final Dispute/i }).click();

        // Confirm redirect to dispute page and capture disputeId
        await page.waitForURL(/\/dashboard\/disputes\/.+/i, { timeout: 2430000 });
        const disputeUrl = page.url();
        disputeId = disputeUrl.split('/dashboard/disputes/')[1]?.split('?')[0] || '';
        console.log(`✅ Act 2 Complete: Dispute Raised. Dispute ID: ${disputeId}`);
    });

    test('Act 3: Mediation Chat & Admin Intervention', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- Act 3: Mediation Chat & Admin Intervention ---');
        await helper.auth.loginAsAdmin();
        
        // Navigate directly to dispute page if we have the ID, otherwise search via list
        if (disputeId) {
            await page.goto(`/dashboard/disputes/${disputeId}`);
        } else {
            await page.goto('/dashboard/disputes');
            await page.waitForTimeout(3000);
            // Try finding by jobId text or click first dispute
            const byJobId = page.getByText(jobId).first();
            if (await byJobId.isVisible({ timeout: 1620000 }).catch(() => false)) {
                await byJobId.click();
            } else {
                // Fallback: click first dispute card
                await page.locator('[class*="cursor-pointer"]').first().click();
            }
        }

        // Post Admin Message
        await expect(page.locator('textarea[placeholder="Type your message here..."]')).toBeVisible({ timeout: 1620000 });
        await page.locator('textarea[placeholder="Type your message here..."]').fill('Admin: I have reviewed the evidence. This looks like a clear breach of protocol.');
        await page.getByRole('button', { name: /Send/i }).click();
        await helper.form.waitForToast('Message Sent', 10000).catch(() => { });

        console.log('✅ Act 3 Complete: Admin Intervention Active.');
    });

    test('Act 4: Admin Decision (Full Refund)', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- Act 4: Admin Decision (Full Refund) ---');
        await helper.auth.loginAsAdmin();

        // Navigate directly to dispute page if we have the ID
        if (disputeId) {
            await page.goto(`/dashboard/disputes/${disputeId}`);
        } else {
            await page.goto('/dashboard/disputes');
            await page.waitForTimeout(3000);
            const byJobId = page.getByText(jobId).first();
            if (await byJobId.isVisible({ timeout: 1620000 }).catch(() => false)) {
                await byJobId.click();
            } else {
                await page.locator('[class*="cursor-pointer"]').first().click();
            }
        }

        await expect(page).toHaveURL(/\/dashboard\/disputes\/.+/, { timeout: 1620000 });

        const markReviewBtn = page.getByRole('button', { name: /Mark as Under Review/i });
        if (await markReviewBtn.isVisible({ timeout: 1620000 }).catch(() => false)) {
            await markReviewBtn.click();
            await page.waitForTimeout(1500);
        }

        await page.getByRole('button', { name: /Resolve Dispute/i }).click();
        
        page.once('dialog', dialog => dialog.accept()); // Just in case there is a window.confirm
        await page.getByRole('button', { name: /Option A: Cancel Job & Refund Giver/i }).click();

        await helper.form.waitForToast('Dispute Resolved', 15000).catch(() => { });
        
        console.log('✅ Act 4 Complete: Admin Refunded Client.');
    });

    test('Act 5: Final Verification', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 5: Verification ---');

        // Client checks dashboard
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await expect(page.getByTestId('job-status-badge')).toContainText('Cancelled', { ignoreCase: true });

        // Professional checks status
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await expect(page.getByTestId('job-status-badge')).toContainText('Cancelled', { ignoreCase: true });

        console.log('✅ Act 5 Complete: Dispute Audit Successful.');
    });
});
