
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { getDateString, getDateTimeString, TIMEOUTS } from '../fixtures/test-data';

/**
 * Case 1: Standard Flow
 * **Goal**: Verify the perfect transaction.
 * 1.  **👤 JG**: Login. Click "Post a Job". Fill details (Title: "Test CCTV"). Budget: ₹5000. Post.
 * 2.  **👷 IN**: Login. Browse Jobs. Find "Test CCTV". Click "Bid". Enter ₹5000. Submit.
 * 3.  **👤 JG**: Go to "My Jobs". See Bid. Click "Award". Confirm.
 * 4.  **👷 IN**: Go to "My Bids". See "Offer Received". Click "Accept".
 * 5.  **👤 JG**: Go to "My Jobs". Click "Fund Project". Pay ₹5000 (Test Card).
 * 6.  **👷 IN**: Go to "My Jobs". See status "In Progress". Click "Submit Work". Upload photo.
 * 7.  **👤 JG**: Receive notification. Check work. Click "Release Payment".
 * 8.  **✅ Result**: Job Complete. Installer wallet +₹4500 (minus fees).
 */

const CASE_1_DATA = {
    title: 'Test CCTV',
    description: 'Detailed job description for Case 1. Includes requirements, scope, constraints and expected deliverables for CCTV installation in a 2BHK apartment.',
    category: 'CCTV Installation', // Adjust if needed based on dropdown
    skills: 'CCTV',
    pincode: '560001',
    budget: 5000,
    fullAddress: '123 Test St, Bangalore',
};

test.describe('Beta Squad - Group A', () => {
    let jobId: string;
    const uniqueJobTitle = `${CASE_1_DATA.title} - ${Date.now()}`;

    test('Case 1: Standard Flow', async ({ browser }) => {
        test.setTimeout(300000); // 5 mins

        // --- INITIAL SETUP ---
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page);

        // --- Step 1: JG Post Job ---
        console.log('--- Step 1: JG Post Job ---');
        await helper.auth.loginAsJobGiver();
        await helper.nav.goToPostJob();

        // Dismiss any blocking dialog (draft recovery, template selector, etc.)
        const blockingDialog = page.getByRole('dialog');
        if (await blockingDialog.isVisible().catch(() => false)) {
            const dismissButton = blockingDialog.getByRole('button', { name: /Discard|Cancel|Close|Start Fresh|Skip|No/i }).first();
            if (await dismissButton.isVisible().catch(() => false)) {
                await dismissButton.click({ force: true });
            } else {
                await page.keyboard.press('Escape').catch(() => {});
            }
        }

        // Fill Job Details
        // Use helper form utilities for robust interactions
        await helper.form.selectDropdown('Job Category', 'New Installation');
        await helper.form.fillInput('Job Title', uniqueJobTitle);
        await helper.form.fillTextarea('Job Description', CASE_1_DATA.description);
        // Skills label may vary; use multiple attempts
        try {
            await helper.form.fillInput('Required Skills', CASE_1_DATA.skills);
        } catch {
            await helper.form.fillInput('Skills', CASE_1_DATA.skills);
        }
        await helper.form.fillInput('Pincode', CASE_1_DATA.pincode);
        await page.waitForTimeout(1000);

        await helper.form.fillInput('Detailed Address', CASE_1_DATA.fullAddress).catch(() => page.fill('input[name="address.fullAddress"]', CASE_1_DATA.fullAddress));
        await helper.form.fillInput('Bidding Deadline', getDateString(7)).catch(() => page.fill('input[name="deadline"]', getDateString(7)));
        await helper.form.fillInput('Job Work Start Date & Time', getDateTimeString(8)).catch(() => page.fill('input[name="jobStartDate"]', getDateTimeString(8)));

        // Budget
        await page.fill('input[name="priceEstimate.min"]', CASE_1_DATA.budget.toString());
        await page.fill('input[name="priceEstimate.max"]', CASE_1_DATA.budget.toString());

        // Wait a bit for form to settle
        await page.waitForTimeout(2000);

        // Ensure verification checkbox is checked (required by schema)
        const verifyCheckbox = page.getByRole('checkbox', { name: /I verify that these details are correct/i }).first();
        if (await verifyCheckbox.isVisible().catch(() => false)) {
            await verifyCheckbox.check().catch(() => { /* ignore if custom checkbox */ });
            // Fallback to DOM check if the custom component doesn't respond to Playwright check
            await page.evaluate(() => {
                const cb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(i => (i as HTMLInputElement).nextSibling && (i as HTMLInputElement).nextSibling.textContent && (i as HTMLInputElement).nextSibling.textContent.includes('I verify')) as HTMLInputElement | undefined;
                if (cb) cb.checked = true;
            });
        }

        // Check for validation errors
        const errors = await page.evaluate(() => {
            const errorElements = document.querySelectorAll('[role="alert"], .text-red-500, .error');
            const errorTexts: string[] = [];
            errorElements.forEach(el => {
                const text = el.textContent?.trim();
                if (text) errorTexts.push(text);
            });
            return errorTexts;
        });
        
        if (errors.length > 0) {
            console.log('[WARN] Form validation errors detected:', errors);
        }

        // Hide overlays before clicking
        await page.evaluate(() => {
            const emulatorWarning = document.querySelector('.firebase-emulator-warning');
            if (emulatorWarning) (emulatorWarning as any).style.display = 'none';
            document.querySelectorAll('button').forEach((btn: any) => {
                if (btn.textContent?.includes('Beta') || btn.textContent?.includes('Feedback') || (btn.classList.contains('fixed') && btn.classList.contains('z-50'))) {
                    btn.style.display = 'none';
                    btn.style.pointerEvents = 'none';
                }
            });
        });

            // Prepare form and submit using robust helpers
            await helper.preparePostJobSubmission();
            await helper.submitPostJob({ force: true });
        
        // Wait for submission and redirect
        try {
            await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });
            jobId = await helper.job.getJobIdFromUrl();
            console.log(`[PASS] Job Posted: ${jobId}`);
        } catch (e) {
            console.error('[ERROR] Failed to post job:', e);
            const url = page.url();
            const pageText = await page.textContent('body');
            console.log('[DEBUG] Current URL:', url);
            console.log('[DEBUG] Page contains:', pageText?.substring(0, 500));
            throw e;
        }

        // --- Step 2: IN Bid ---
        console.log('--- Step 2: IN Bid ---');
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);

        await expect(page.getByTestId('job-title')).toContainText(CASE_1_DATA.title);
        await page.getByTestId('place-bid-button').click();
        await page.locator('input[name="amount"]').fill(CASE_1_DATA.budget.toString());
        await page.fill('textarea[name="coverLetter"]', 'I can do this for 5000');
        await page.getByRole('button', { name: "Place Bid" }).click();
        await helper.form.waitForToast('Bid Placed!');
        console.log('[PASS] Bid Placed');

        // --- Step 3: JG Award ---
        console.log('--- Step 3: JG Award ---');
        await helper.auth.logout();
        await helper.auth.loginAsJobGiver();
        await page.goto(`/dashboard/jobs/${jobId}`);

        await page.getByTestId('send-offer-button').first().click();
        await helper.form.waitForToast('Offer Sent');
        console.log('[PASS] Offer Sent');

        // --- Step 4: IN Accept ---
        console.log('--- Step 4: IN Accept ---');
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Wait for conflict check logs or dialogs
        await page.getByTestId('accept-job-button').first().click();

        // Handle Conflict Dialog if it appears
        const conflictDialog = page.getByText('Schedule Conflict Warning');
        if (await conflictDialog.isVisible({ timeout: 5000 })) {
            await page.getByRole('button', { name: "I Understand, Proceed & Accept" }).click();
        }

        await helper.form.waitForToast('Job Accepted!');
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[PASS] Job Accepted');

        // --- Step 5: JG Fund ---
        console.log('--- Step 5: JG Fund ---');
        await helper.auth.logout();
        await helper.auth.loginAsJobGiver();
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

        const otpLocator = page.getByTestId('start-otp-value');
        await expect(otpLocator).toBeVisible();
        const startOtp = await otpLocator.innerText();
        console.log(`[PASS] Job Funded, OTP: ${startOtp}`);

        // --- Step 6: IN Submit Work ---
        console.log('--- Step 6: IN Submit Work ---');
        await helper.auth.logout();
        await helper.auth.loginAsInstaller();
        await page.goto(`/dashboard/jobs/${jobId}`);

        // Start Job
        await page.locator('input[placeholder="Enter Code"]').fill(startOtp);
        await page.getByRole('button', { name: 'Start' }).click();
        await helper.job.waitForJobStatus('In Progress');

        // Submit Work
        const completionSection = page.getByTestId('installer-completion-section');
        await expect(completionSection).toBeVisible();
        await completionSection.locator('input[type="file"]').setInputFiles({
            name: 'work.png',
            mimeType: 'image/png',
            buffer: Buffer.from('work proof')
        });

        await page.getByTestId('submit-for-review-button').click();
        await helper.form.waitForToast('Submitted for Confirmation');
        await helper.job.waitForJobStatus('Pending Confirmation');
        console.log('[PASS] Work Submitted');

        // --- Step 7: JG Release Payment ---
        console.log('--- Step 7: JG Release Payment ---');
        await helper.auth.logout();
        await helper.auth.loginAsJobGiver();
        await page.goto(`/dashboard/jobs/${jobId}`);

        const approveBtn = page.getByTestId('approve-release-button');
        await expect(approveBtn).toBeVisible();
        await approveBtn.click();
        await helper.form.waitForToast('Job Approved & Payment Released!');
        await helper.job.waitForJobStatus('Completed');
        console.log('[PASS] Payment Released, Job Completed');

        await context.close();
    });
});
