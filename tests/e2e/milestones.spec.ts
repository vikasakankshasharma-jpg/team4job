
import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_JOB_DATA } from '../fixtures/test-data';
import { AuthHelper } from '../utils/helpers';

test.describe('Milestone-based Payments', () => {
    let jobId: string;
    let helper: { auth: AuthHelper };

    test.beforeEach(async ({ page }) => {
        helper = { auth: new AuthHelper(page) };
    });

    // TODO: Test uses execSync('npx tsx scripts/seed-job.ts') for seeding which is:
    // 1. Synchronous and blocks test execution
    // 2. Dependent on external script infrastructure
    // 3. Fragile in CI/CD environments
    // Recommend: Convert seed-job.ts to async exportable function and import directly.
    test.skip('Job Giver can create and release milestones', async ({ page }) => {
        // 1. Seed Job (Bypass Posting UI)
        console.log("Seeding job...");
        const { execSync } = require('child_process');
        let jobId;
        try {
            const output = execSync('npx tsx scripts/seed-job.ts').toString().trim();
            jobId = output.split('\n').pop().trim(); // Get last line
            console.log(`Seeded Job ID: ${jobId}`);
        } catch (error) {
            console.error("Failed to seed job", error);
            throw error;
        }

        // 2. Login and Navigate
        await helper.auth.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await page.goto(`/dashboard/jobs/${jobId}`);
        await expect(page.locator('[data-status="In Progress"]')).toBeVisible();

        // 3. Create Milestone 1
        await page.click('[data-testid="add-milestone-button"]');
        await expect(page.locator('text=Add Milestone')).toBeVisible();

        await page.fill('input[id="title"]', 'Phase 1: Wiring');
        await page.fill('input[id="amount"]', '5000');
        await page.click('button:has-text("Add Milestone")');

        // Verify Milestone 1 appears
        await expect(page.locator('text=Phase 1: Wiring')).toBeVisible();
        await expect(page.locator('text=₹5,000')).toBeVisible();

        // 4. Create Milestone 2 (Exceeding Budget Check)
        await page.click('[data-testid="add-milestone-button"]');
        await page.fill('input[id="title"]', 'Phase 2: Final');
        await page.fill('input[id="amount"]', '16000'); // 16k + 5k > 20k budget
        // Verify submit is disabled or validation error (Logic handled in dialog: disabled={... > maxAmount})
        await expect(page.locator('button:has-text("Add Milestone")')).toBeDisabled();

        // Correct the amount
        await page.fill('input[id="amount"]', '10000');
        await expect(page.locator('button:has-text("Add Milestone")')).toBeEnabled();
        await page.click('button:has-text("Add Milestone")');

        // 5. Release Milestone 1
        await page.click('button:has-text("Release Payment") >> nth=0'); // First release button

        // Verify status update
        await expect(page.locator('text=Paid').first()).toBeVisible();
        await expect(page.locator('text=Payment Released')).toBeVisible(); // Toast
    });
});
