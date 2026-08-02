
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

test.describe('Secured Variation Orders', () => {

    // Shared Data
    let jobId: string;

    test('Full Variation Order Cycle', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.mockExternalAPIs();
        await page.setViewportSize({ width: 1280, height: 1000 });

        // 1. Client Creates Job
        console.log('--- Step 1: Client Creates Job ---');
        await helper.auth.login(TEST_ACCOUNTS.clientBusiness.email, TEST_ACCOUNTS.clientBusiness.password);
        await helper.auth.ensureRole('Client');
        await helper.nav.goToPostJob();

        // 🚦 RECOVERY: Pre-clear any old state if needed, but since we use unique titles it's fine
        const jobTitle = 'Variation Test Job ' + Date.now();
        const branchAnswers = [
            '3-4',
            'Both',
            'Commercial',
            'needs fresh wiring',
            '1 week',
            'Not needed',
            'Mobile viewing only'
        ];

        await helper.form.completeWizard(
            'Security & Surveillance',
            'CCTV / Video Surveillance',
            branchAnswers,
            'Within 1-2 Days'
        );

        // Fill remaining details on the final form
        await helper.form.fillInput('Job Title', jobTitle);
        await helper.form.fillInput('Job Description', 'A simple job for testing variations. Must be at least 50 chars long to pass validation.');
        await helper.form.fillInput('Min Budget', '5000');
        await helper.form.fillInput('Max Budget', '10000');
        await helper.form.submitPostJob("110001");

        // Check for navigation
        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: 120000 });
        jobId = await helper.job.getJobIdFromUrl();
        console.log(`Created Job: ${jobId}`);

        // 2. Professional Bids
        console.log('--- Step 2: Professional Bids ---');
        await helper.auth.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password);
        await helper.auth.ensureRole('Professional');
        
        console.log(`Professional navigating to job: /dashboard/jobs/${jobId}`);
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.waitForStability();

        const placeBidBtn = page.getByTestId('place-bid-button').first();
        await placeBidBtn.waitFor({ state: 'visible', timeout: 30000 });
        await placeBidBtn.click();

        // Wait for bid dialog - use named role to avoid Next.js error overlay (strict mode)
        const bidDialog = page.getByRole('dialog', { name: /Place a Bid|Place Bid/i });
        await bidDialog.waitFor({ state: 'visible', timeout: 10000 });

        await bidDialog.locator('input[name="amount"]').fill('5000');
        await bidDialog.locator('textarea[name="coverLetter"]').fill('I am proposing a professional installation with variation support. I have extensive experience in CCTV systems.');
        
        const submitBidBtn = bidDialog.getByTestId('submit-bid-button').first();
        await submitBidBtn.click({ force: true });
        await bidDialog.waitFor({ state: 'hidden', timeout: 60000 });
        
        await helper.form.waitForToast('Bid Placed', 60000); 
        console.log('[PASS] Bid Placed');

        // 3. Client Awards
        console.log('--- Step 3: Client Awards ---');
        await helper.auth.login(TEST_ACCOUNTS.clientBusiness.email, TEST_ACCOUNTS.clientBusiness.password);
        await helper.auth.ensureRole('Client');
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.waitForStability();

        // Wait for bids to load and find the specific bid
        await page.getByTestId('bid-card-wrapper').first().waitFor({ state: 'visible', timeout: 30000 });
        await page.getByTestId('send-offer-button').first().click();
        await helper.job.handleAuthorizationModal();
        await helper.form.waitForToast('Offer Sent');
        console.log('[PASS] Offer Sent');

        // 4. Professional Accepts
        console.log('--- Step 4: Professional Accepts ---');
        await helper.auth.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password);
        await helper.auth.ensureRole('Professional');
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.waitForStability();

        await page.getByTestId('accept-job-button').first().click();

        // Handle Conflict Dialog if it appears
        const conflictDialog = page.getByText('Schedule Conflict Warning');
        if (await conflictDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.getByTestId('bypass-conflict-button').click();
        }

        await helper.form.waitForToast('Job Accepted');
        await helper.job.waitForJobStatus('Pending Funding');
        console.log('[PASS] Job Accepted');

        // 5. Client Funds Job
        console.log('--- Step 5: Client Funds Job ---');
        await helper.auth.login(TEST_ACCOUNTS.clientBusiness.email, TEST_ACCOUNTS.clientBusiness.password);
        await helper.auth.ensureRole('Client');
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.waitForStability();

        await page.getByTestId('proceed-payment-button').click();

        // Bypass payment using shim
        await page.waitForFunction(() => (window as any).e2e_directFundJob !== undefined);
        await page.evaluate(async () => {
            await page.getByTestId('e2e-direct-fund').click({ force: true });
        });
        await helper.form.waitForToast('Test Mode');

        await page.waitForTimeout(2000);
        await page.reload();
        await helper.job.waitForJobStatus('In Progress');
        console.log('[PASS] Job Funded, Status: In Progress');

        // 6. Professional Proposes Variation
        console.log('--- Step 6: Professional Proposes Variation ---');
        await helper.auth.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password);
        await helper.auth.ensureRole('Professional');
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.waitForStability();

        await page.click('[data-testid="propose-variation-button"]');
        await page.getByTestId('variation-description-input').fill('Extra Copper Wiring for Outdoor Units');
        await page.getByTestId('variation-amount-input').fill('1500');
        await page.getByTestId('variation-submit-button').click();

        await expect(page.locator('text=Variation Proposed').first()).toBeVisible({ timeout: 15000 });
        console.log('[PASS] Variation Proposed');

        // 7. Client Pays for Variation
        console.log('--- Step 7: Client Pays for Variation ---');
        await helper.auth.login(TEST_ACCOUNTS.clientBusiness.email, TEST_ACCOUNTS.clientBusiness.password);
        await helper.auth.ensureRole('Client');
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.waitForStability();

        // Find Approve & Fund button in the list
        const approveBtn = page.getByTestId('approve-variation-button').first();
        await approveBtn.waitFor({ state: 'visible', timeout: 30000 });
        
        // Handle confirmation dialog
        page.once('dialog', dialog => dialog.accept());
        await approveBtn.click();
        
        await helper.form.waitForToast('Test Mode');
        console.log('[PASS] Variation Payment Initiated');
        
        await page.waitForTimeout(2000);
        await page.reload();
        await expect(page.locator('text=Variation Paid').first()).toBeVisible({ timeout: 15000 });
        console.log('[PASS] Variation Cycle Complete');
    });
});
