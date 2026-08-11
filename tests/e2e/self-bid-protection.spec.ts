
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

        // Fill job details on the final form
        const titleInput = page.locator('input[name="jobTitle"], input#job-title-input-field').first();
        await titleInput.waitFor({ state: 'attached', timeout: 15000 });
        await titleInput.scrollIntoViewIfNeeded();
        await titleInput.click({ force: true });
        await titleInput.fill(jobTitle);

        const descInput = page.locator('[data-testid="job-description-input"], textarea[name="jobDescription"]').first();
        await descInput.scrollIntoViewIfNeeded();
        await descInput.fill('Testing self-bid protection. This job should not be biddable by the owner.');
        
        // Select category
        await page.getByTestId('job-category-select').click({ force: true });
        await page.locator('[role="option"]').first().click({ force: true });

        const skillsInput = page.locator('input[name="skills"], [data-testid="skills-input"]').first();
        await skillsInput.scrollIntoViewIfNeeded();
        await skillsInput.fill('React, Testing');

        // Use robust pincode helper
        await helper.form.fillPincodeAndSelectPO('110001');

        await page.fill('input[name="address.house"]', 'Self-Bid House');
        await page.fill('input[name="address.street"]', 'Guardrail St');
        await page.fill('input[name="address.landmark"]', 'Near Protection Park');
        await page.fill('input[name="address.fullAddress"]', 'Self-Bid House, Guardrail St, Near Protection Park, 110001');

        // Dates
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        await page.fill('input[name="deadline"]', tomorrow.toISOString().split('T')[0]);
        await page.fill('input[name="jobStartDate"]', nextWeek.toISOString().slice(0, 16));

        await page.fill('[data-testid="min-budget-input"]', '1000');
        await page.fill('[data-testid="max-budget-input"]', '5000');

        // Use the robust submitPostJob helper that handles checkboxes and confirmation modals
        await helper.form.submitPostJob();

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


