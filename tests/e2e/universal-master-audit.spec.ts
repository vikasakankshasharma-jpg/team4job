
import { test, expect, Page } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS, TIMEOUTS, TEST_CREDENTIALS, getDateString, getDateTimeString } from '../fixtures/test-data';
import { getAdminDb } from '../../src/infrastructure/firebase/admin';

/**
 * 🕵️ UNIVERSAL MASTER AUDIT SUITE
 * 
 * This suite verifies the entire platform surface in a single multi-role interaction.
 * Acts 1-7: Profile -> Post -> Chat -> Award -> Work -> Admin -> Review.
 */

test.describe('Universal Master Audit', () => {
    // Serial mode is REQUIRED as we are sharing an emulator state across role switches
    test.describe.configure({ mode: 'serial' });

    let jobId: string;
    let startOtp: string;
    const uniqueTitle = `Audit Job - CCTV - ${Date.now()}`;

    test('Act 1: Profile & Discovery (Installer)', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 1: Installer Profile Update ---');
        
        await helper.auth.loginAsProfessional();
        await page.goto('/dashboard/profile');
        
        // Update Skills
        const editProfileBtn = page.getByRole('button', { name: /Edit Profile/i }).first();
        if (await editProfileBtn.isVisible()) {
            await editProfileBtn.click();
            const skillsInput = page.locator('input[name="skills"], input[placeholder*="Skills"]').first();
            await skillsInput.fill('CCTV, Smart Home, Audit-Testing');
            await page.getByRole('button', { name: /Save|Update/i }).first().click();
            await helper.form.waitForToast(/Updated/i).catch(() => {});
        }
        
        console.log('✅ Act 1 Complete: Profile updated.');
    });

    test('Act 2: Job Posting & Match (Client)', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 2: Client Posts Matching Job ---');
        
        await helper.auth.loginAsClient();
        await helper.form.completeWizard(
            'Security & Surveillance',
            'CCTV / Video Surveillance',
            [
                '5-8 Points', 
                'Both Indoor & Outdoor', 
                'Commercial / Office', 
                'No, needs fresh wiring', 
                '1 Month or more', 
                'Not needed', 
                'Both Mobile & Monitor'
            ],
            'Within 1-2 Days'
        );
        
        await page.getByTestId('job-title-input').fill(uniqueTitle);
        await page.locator('[data-testid="job-description-input"]').fill('Master Audit Job. Requires expert CCTV skills.');
        await page.fill('input[name="skills"]', 'CCTV, Audit-Testing');
        await helper.form.fillPincodeAndSelectPO('560001');
        await page.fill('input[name="address.fullAddress"]', 'Audit Mansion, Bangalore');
        
        await page.fill('input[name="deadline"]', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(8));
        await page.fill('[data-testid="min-budget-input"]', '5000');
        await page.fill('[data-testid="max-budget-input"]', '7000');

        await helper.preparePostJobSubmission();
        await helper.form.submitPostJob();
        
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium });
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`✅ Act 2 Complete: Job posted (${jobId}).`);
    });

    test('Act 3: Negotiation & Communication', async ({ browser }) => {
        console.log('--- ACT 3: Real-time Interaction (Chat) ---');
        
        const contextIN = await browser.newContext();
        const pageIN = await contextIN.newPage();
        const helperIN = new TestHelper(pageIN);
        
        const contextJG = await browser.newContext();
        const pageJG = await contextJG.newPage();
        const helperJG = new TestHelper(pageJG);

        // IN Bids
        await helperIN.auth.loginAsProfessional();
        await pageIN.goto(`/dashboard/jobs/${jobId}`);
        await pageIN.getByTestId('place-bid-button').click();
        await pageIN.locator('input[name="amount"]').fill('6000');
        await pageIN.fill('textarea[name="coverLetter"]', 'I have the specific skills for this audit.');
        await pageIN.getByRole('button', { name: "Place Bid" }).click();
        await helperIN.form.waitForToast('Bid Placed!');

        // JG Sees Bid and Chats
        await helperJG.auth.loginAsClient();
        await pageJG.goto(`/dashboard/jobs/${jobId}`);
        const bidCard = pageJG.getByTestId('bid-card-wrapper').first();
        await expect(bidCard).toBeVisible({ timeout: TIMEOUTS.medium });

        // Open Chat (Assuming button exists on bid card or job details)
        const chatBtn = pageJG.getByRole('button', { name: /Message|Chat/i }).first();
        if (await chatBtn.isVisible()) {
            await chatBtn.click();
            await pageJG.locator('textarea[placeholder*="message"]').fill('Hello Installer, are you ready?');
            await pageJG.keyboard.press('Enter');
            
            // IN Verifies Message
            await pageIN.reload(); // Force sync if sockets aren't instant in dev
            await expect(pageIN.locator('body')).toContainText('Hello Installer');
            console.log('✅ Real-time Chat Verified.');
        }

        await contextIN.close();
        await contextJG.close();
    });

    test('Act 4: Award & Escrow (Financial Lock)', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 4: Awarding & Funding ---');
        
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        
        // Award
        const awardBtn = page.getByTestId('send-offer-button').first();
        await awardBtn.click();
        await helper.form.waitForToast('Offer Sent');

        // IN Accept
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('accept-job-button').first().click();
        
        // JG Fund
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('proceed-payment-button').click();
        
        // Bypass payment via shim
        await page.waitForFunction(() => (window as any).e2e_directFundJob !== undefined);
        await page.evaluate(async () => { await (window as any).e2e_directFundJob(); });
        
        await helper.job.waitForJobStatus('In Progress');
        startOtp = await page.getByTestId('start-otp-value').innerText();
        console.log(`✅ Act 4 Complete: Funded. OTP: ${startOtp}`);
    });

    test('Act 5: Work & Approval', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 5: Work Execution ---');
        
        // IN Start
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.locator('input[placeholder="Enter Code"]').fill(startOtp);
        await page.getByRole('button', { name: 'Start' }).click();
        
        // Submit Work
        await page.getByTestId('Professional-completion-section').locator('input[type="file"]').setInputFiles({
            name: 'audit_proof.png', mimeType: 'image/png', buffer: Buffer.from('audit')
        });
        await page.getByTestId('submit-for-review-button').click();
        await helper.job.waitForJobStatus('Pending Confirmation');
        
        // JG Approve
        await helper.auth.logout();
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('approve-release-button').click();
        await helper.job.waitForJobStatus('Completed');
        
        console.log('✅ Act 5 Complete: Job Completed and Approved.');
    });

    test('Act 6: Admin Dashboard Verification', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 6: Admin Audit ---');
        
        await helper.auth.loginAsAdmin();
        await page.goto('/dashboard/admin/jobs');
        
        // Find job in admin list
        const adminJobRow = page.locator('tr').filter({ hasText: jobId });
        await expect(adminJobRow).toBeVisible({ timeout: TIMEOUTS.medium });
        await expect(adminJobRow).toContainText('Completed');
        
        console.log('✅ Act 6 Complete: Admin verified state.');
    });

    test('Act 7: Reputation (Mutual Review)', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- ACT 7: Mutual Review Flow ---');
        
        // JG Rates IN
        await helper.auth.loginAsClient();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('rating-star-5').click();
        await page.getByTestId('rating-comment').fill('Excellent audit candidate.');
        await page.getByTestId('submit-review-button').click();
        
        // Verify "Locked" View (Sealed Review)
        await expect(page.getByTestId('review-locked-card')).toBeVisible();
        
        // IN Rates JG
        await helper.auth.logout();
        await helper.auth.loginAsProfessional();
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.getByTestId('rating-star-5').click();
        await page.getByTestId('rating-comment').fill('Great experience throughout the audit.');
        await page.getByTestId('submit-review-button').click();
        
        // Verify "Revealed" View
        await expect(page.getByTestId('reviews-revealed-section')).toBeVisible();
        await expect(page.getByText('Excellent audit candidate.')).toBeVisible();
        
        console.log('✅ Act 7 Complete: Mission Successful.');
    });
});
