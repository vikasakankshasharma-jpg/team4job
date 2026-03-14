
import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_JOB_DATA } from '../fixtures/test-data';
import { AuthHelper } from '../utils/helpers';
import { execSync } from 'child_process';

test.describe('Milestone-based Payments @slow', () => {
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

        // Wait for hydration and data load
        await page.waitForTimeout(3000);
        await expect(page.getByTestId('job-status-badge')).toContainText(/In Progress/i);

        // 3. Create Milestone 1
        // Wait for milestone section to be interactive
        const addBtn = page.getByTestId('add-milestone-button');
        await addBtn.waitFor({ state: 'visible', timeout: 15000 });
        await page.waitForTimeout(2000); // Extra safety for hydration
        await addBtn.click({ force: true });
        await expect(page.locator('text=Milestone Title')).toBeVisible();

        await page.fill('input[id="title"]', 'Phase 1: Wiring');
        await page.fill('input[id="amount"]', '5000');
        await page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' }).click();

        // Verify Milestone 1 appears
        await expect(page.locator('text=Phase 1: Wiring')).toBeVisible();
        await expect(page.locator('text=₹5,000')).toBeVisible();

        // 4. Create Milestone 2 (Exceeding Budget Check)
        // Ensure success toast from first milestone is acknowledged and cleared
        try {
            const toast = page.locator('li:has-text("Milestone has been added")');
            if (await toast.isVisible()) {
                await toast.locator('button').click(); // Try to close it
                await expect(toast).not.toBeVisible({ timeout: 5000 });
            }
        } catch (e) { /* ignore if not present */ }

        await page.waitForTimeout(2000); // Wait for UI to settle
        await page.getByTestId('add-milestone-button').click({ force: true });
        const dialog2 = page.getByRole('dialog');
        await expect(dialog2).toBeVisible();
        await expect(dialog2.locator('text=Milestone Title')).toBeVisible();

        await dialog2.locator('input[id="title"]').fill('Phase 2: Final');
        await dialog2.locator('input[id="amount"]').fill('16000'); // 16k + 5k > 20k budget
        // Verify submit is disabled or validation error (Logic handled in dialog: disabled={... > maxAmount})
        await expect(page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' })).toBeDisabled();

        // Correct the amount
        await page.fill('input[id="amount"]', '10000');
        await expect(page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' })).toBeEnabled();
        await page.getByRole('dialog').getByRole('button', { name: 'Add Milestone' }).click({ force: true });

        // Wait for dialog to close and list to update
        await page.waitForTimeout(2000);

        // 5. Release Milestone 1
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Release Payment' }).first().click();

        // Verify status update
        await expect(page.locator('text=Paid').first()).toBeVisible();
    });
});
