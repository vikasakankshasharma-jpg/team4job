
import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_JOB_DATA } from '../fixtures/test-data';
import { AuthHelper } from '../utils/helpers';
import { execSync } from 'child_process';

test.describe('Milestone-based Payments', () => {
    let jobId: string;
    let helper: { auth: AuthHelper };

    test.beforeEach(async ({ page }) => {
        helper = { auth: new AuthHelper(page) };
    });

    test('Job Giver can create and release milestones', async ({ page }) => {
        // 1. Seed Job (Bypass Posting UI)
        console.log("Seeding job...");
        let jobId;
        try {
            const output = execSync('npx tsx scripts/seed-job.ts').toString().trim();
            jobId = output.split('\n').pop()?.trim() || ''; // Get last line with fallback
            console.log(`Seeded Job ID: ${jobId}`);
        } catch (error) {
            console.error("Failed to seed job", error);
            throw error;
        }

        // 2. Login and Navigate
        await helper.auth.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await page.goto(`/dashboard/jobs/${jobId}`);
        await page.addStyleTag({ content: '.CookieConsent { display: none !important; }' });
        await page.waitForTimeout(5000); // Allow data & animations to fully settle
        await expect(page.getByTestId('job-status-badge')).toContainText('In Progress');

        // 3. Create Milestone 1
        const addBtn = page.getByRole('button', { name: 'Add Milestone', exact: true }).first();
        await addBtn.waitFor({ state: 'visible', timeout: 10000 });
        await addBtn.click({ force: true });
        await expect(page.locator('text=Milestone Title')).toBeVisible();

        await page.fill('input[id="title"]', 'Phase 1: Wiring');
        await page.fill('input[id="amount"]', '5000');
        await page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' }).click();

        // Verify Milestone 1 appears
        await expect(page.locator('text=Phase 1: Wiring')).toBeVisible();
        await expect(page.locator('text=₹5,000')).toBeVisible();

        // 4. Create Milestone 2 (Exceeding Budget Check)
        await page.getByTestId('add-milestone-button').click({ force: true });
        await expect(page.locator('text=Milestone Title')).toBeVisible();
        await page.fill('input[id="title"]', 'Phase 2: Final');
        await page.fill('input[id="amount"]', '16000'); // 16k + 5k > 20k budget
        // Verify submit is disabled or validation error (Logic handled in dialog: disabled={... > maxAmount})
        await expect(page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' })).toBeDisabled();

        // Correct the amount
        await page.fill('input[id="amount"]', '10000');
        await expect(page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' })).toBeEnabled();
        await page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' }).click({ force: true });

        // 5. Release Milestone 1
        await page.getByRole('button', { name: 'Release Payment' }).first().click();

        // Verify status update
        await expect(page.locator('text=Paid').first()).toBeVisible();
    });
});
