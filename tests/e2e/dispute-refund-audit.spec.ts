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
        
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`Job Created: ${jobId}`);

        // Award to Amit Pro
        await page.getByTestId('send-offer-button').first().click();
        await helper.form.waitForToast('Offer Sent');
        await page.waitForTimeout(2000); // Wait for background triggers
        
        // Professional Accept
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('accept-job-button').first().click();
        
        // Client Fund
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.evaluate(async () => { await (window as any).e2e_directFundJob(); });
        await helper.job.waitForJobStatus('In Progress');
        startOtp = await page.getByTestId('start-otp-value').innerText();

        // Professional Start & Submit unsatisfactory work
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.locator('input[placeholder="Enter Code"]').fill(startOtp);
        await page.locator('button:has-text("Start"), button[data-testid="start-job-btn"]').first().click();
        
        await page.getByTestId('Professional-completion-section').locator('input[type="file"]').setInputFiles({
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

        // Raise Dispute via the UI
        await page.getByRole('button', { name: /Dispute/i }).first().click();
        
        // Handle Radix Select for Reason
        await page.getByLabel(/Reason/i).first().click();
        await page.getByRole('option', { name: 'Poor Quality Work' }).click();
        
        await page.getByLabel(/Description/i).fill('The professional only installed 2 cameras instead of 8. I want a full refund.');
        await page.getByRole('button', { name: 'Submit Dispute' }).click();

        // Confirm status changed to Disputed
        await helper.job.waitForJobStatus('disputed');
        console.log('✅ Act 2 Complete: Dispute Successfully Raised.');
    });

    test('Act 3: Mediation Chat & Admin Intervention', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 3: Admin Joins Mediation ---');

        await helper.auth.loginAsAdmin();
        const disputeId = await page.evaluate(() => {
            return document.querySelector('[data-dispute-id]')?.getAttribute('data-dispute-id');
        }) || jobId; // Fallback to jobId if explicit ID not found

        await page.goto('/dashboard/disputes');
        await page.getByText(jobId).first().click();

        // Post Admin Message
        await page.locator('textarea[placeholder="Type your message..."]').fill('Admin: I have reviewed the evidence. This looks like a clear breach of protocol.');
        await page.getByRole('button', { name: 'Send' }).click();

        await expect(page.getByText('clear breach of protocol')).toBeVisible();
        console.log('✅ Act 3 Complete: Admin mediated.');
    });

    test('Act 4: Admin Decision (Full Refund)', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 4: Admin Refund Trigger ---');

        await helper.auth.loginAsAdmin();
        await page.goto('/dashboard/admin'); // Go to main admin dashboard
        
        // Find the alert for our job and click Refund
        const alertCard = page.locator('div.rounded-lg').filter({ hasText: jobId });
        await expect(alertCard).toBeVisible({ timeout: TIMEOUTS.medium });
        
        // Wait for the specific Refund button in the alert card
        const refundButton = alertCard.getByRole('button', { name: /refund/i });
        await expect(refundButton).toBeVisible();
        
        // The resolve handler uses window.confirm, so we must handle it
        page.once('dialog', dialog => dialog.accept());
        await refundButton.click();

        await helper.job.waitForJobStatus('refunded');
        console.log('✅ Act 4 Complete: Refund Processed.');
    });

    test('Act 5: Final Verification', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 5: Verification ---');

        // Client checks dashboard
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await expect(page.getByText('This job has been refunded.')).toBeVisible();
        await expect(page.getByTestId('job-status-badge')).toContainText('Refunded');

        // Professional checks status
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await expect(page.getByText('This job has been resolved with a refund to the client.')).toBeVisible();

        console.log('✅ Act 5 Complete: Dispute Audit Successful.');
    });
});
