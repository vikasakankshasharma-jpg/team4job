
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { generateUniqueJobTitle, TIMEOUTS } from '../fixtures/test-data';

const DUAL_ROLE_USER = {
    email: 'anita.dual@team4job.com',
    password: 'TestUser_2026!'
};

test.describe('Self-Interaction Guardrails', () => {
    let jobId: string;
    let jobTitle = generateUniqueJobTitle();

    test.beforeEach(async ({ page }) => {
        // Ensure we are logged out before starting
        await page.goto('/login');
    });

    test('Dual-role user cannot bid on their own job', async ({ page }) => {
        const helper = new TestHelper(page);

        // 1. Login as Client and Post a Job
        console.log('Logging in as dual-role user (Client mode)...');
        await helper.auth.login(DUAL_ROLE_USER.email, DUAL_ROLE_USER.password);
        await helper.auth.ensureRole('Client');

        console.log('Posting a new job...');
        const reachedPostJob = await helper.nav.goToPostJob();
        if (!reachedPostJob) {
            test.skip(true, 'Post Job form inaccessible due to role guard');
            return;
        }

        // Complete Wizard first (Mandatory redirection to /wizard)
        await helper.form.completeWizard(
            'Security & Surveillance',
            'CCTV / Video Surveillance',
            [
                '3-4', 
                'Both', 
                'Commercial',
                'needs fresh wiring',
                '1 week',
                'Not needed',
                'Mobile viewing only'
            ],
            'Within 1-2 Days'
        );

        // dismiss draft dialog if present
        await page.evaluate(() => {
            document.querySelectorAll('button').forEach(btn => {
                const text = btn.textContent || '';
                if (text.includes('Discard') || text.includes('Beta Feedback') || text.includes('Feedback') || text.trim() === '…') {
                    btn.click();
                }
            });
        });

        // The wizard generates the job title and description.
        // We can read it from the DOM to use for assertions later.
        const generatedTitleElement = page.locator('.text-2xl, h2, h1').first();
        await expect(generatedTitleElement).toBeVisible({ timeout: 15000 });
        jobTitle = await generatedTitleElement.innerText();

        // Use the robust submitPostJob helper that handles checkboxes and confirmation modals
        // Note: The wizard auto-fills most details, we just need to ensure pincode is set if not already
        await helper.form.submitPostJob('110001');

        await page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.long });

        jobId = await helper.job.getJobIdFromUrl();
        console.log(`Job posted with ID: ${jobId}`);

        // 2. Switch to Professional Mode
        console.log('Switching to Professional mode...');
        await helper.auth.ensureRole('Professional');

        // 3. Navigate to the Job
        console.log(`Navigating to job ${jobId} as Professional (same user)...`);
        await page.goto(`/dashboard/jobs/${jobId}`);

        // 4. Verification
        await expect(page.getByTestId('job-title')).toBeVisible({ timeout: 10000 });

        // Wait for actions panel to load
        await expect(page.getByTestId('actions-panel')).toBeVisible();

        const placeBidBtn = page.getByTestId('place-bid-button');
        const closeBiddingBtn = page.getByRole('button', { name: "Close Operations" });

        // Since the user is the OWNER of the job, the UI should strictly show the Client view (Close Bidding)
        // and HIDE the Place Bid button, regardless of the selected 'role' in the user menu.
        // This is the primary safeguard in job-detail-client.tsx: 
        // const isClient = !!(user && job && (user.id === getRefId(job.jobGiver) || user.id === job.jobGiverId));

        if (await placeBidBtn.isVisible()) {
            console.log('WARNING: Place Bid button IS visible initially. Checking if it disappears...');
            // It might be a race condition. Let's wait a moment and check again.
            await page.waitForTimeout(2000);
        }

        await expect(placeBidBtn).not.toBeVisible();
        await expect(closeBiddingBtn).toBeVisible();

        console.log('Success: UX correctly identifies User as Owner and hides bidding controls.');
        console.log('       (Close Bidding button is visible, Place Bid button is hidden)');

        // 5. Cleanup (Cancel Job) - Optional, but good practice
        // Switch back to Client to cancel?
        // await helper.auth.ensureRole('Client');
        // await page.goto(`/dashboard/jobs/${jobId}`);
        // ... cancellation logic ...
    });
});


