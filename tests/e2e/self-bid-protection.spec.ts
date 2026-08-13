import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
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

        // Login as Client to ensure DB is seeded and auth state is ready
        console.log('Logging in as dual-role user...');
        await helper.auth.login(DUAL_ROLE_USER.email, DUAL_ROLE_USER.password);

        console.log('Seeding open job for dual-role user...');
        let seededJobId: string;
        try {
            const seedOutput = execSync('npx --no-install tsx scripts/seed-open-job-dual-role.ts').toString();
            seededJobId = seedOutput.trim().split('\n').pop() || '';
            jobId = seededJobId;
            console.log(`Seeded Job ID: ${jobId}`);
        } catch (error) {
            console.error('Failed to seed open job', error);
            throw error;
        }

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


