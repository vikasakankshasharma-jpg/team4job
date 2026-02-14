
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
    description: 'Test Job for Case 1 Standard Flow',
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

        // Fill Job Details
        // Handle Category Select
        const categorySelect = page.getByTestId('job-category-select');
        await categorySelect.waitFor({ state: 'visible' });
        await categorySelect.click();
        const option = page.locator('[role="option"]').first(); // Just pick first one or filter
        await option.waitFor({ state: 'visible' });
        await option.click();

        await page.fill('input[name="jobTitle"]', uniqueJobTitle);
        await page.locator('textarea[name="jobDescription"]').fill(CASE_1_DATA.description);
        await page.fill('input[name="skills"]', CASE_1_DATA.skills);
        await page.fill('input[placeholder*="110001"]', CASE_1_DATA.pincode);
        await page.waitForTimeout(1000);

        // Select Post Office if needed
        const poTrigger = page.locator('button:has-text("Select Post Office")');
        if (await poTrigger.isVisible()) {
            await poTrigger.click();
            await page.locator('[role="option"]').first().click();
        }

        await page.fill('input[name="address.fullAddress"]', CASE_1_DATA.fullAddress);
        await page.fill('input[name="deadline"]', getDateString(7));
        await page.fill('input[name="jobStartDate"]', getDateTimeString(1)); // Tomorrow

        // Budget
        await page.fill('input[name="priceEstimate.min"]', CASE_1_DATA.budget.toString());
        await page.fill('input[name="priceEstimate.max"]', CASE_1_DATA.budget.toString());

        await page.getByRole('button', { name: "Post Job" }).click();
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`[PASS] Job Posted: ${jobId}`);

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
