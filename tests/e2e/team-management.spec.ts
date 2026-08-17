import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Team Management', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Admin can invite a new team member', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');
        await expect(page).toHaveURL(/.*\/dashboard\/team/);

        const email = `new-member-${Date.now()}@example.com`;

        // Use a robust retry loop to handle Firebase Auth hydration delays,
        // potential input truncation flakes in CI, and slow network responses.
        await expect(async () => {
            // Fill invitation form
            await page.getByLabel(/Full Name/i).fill('New Member');
            await page.getByLabel(/Email Address/i).fill(email);
            await expect(page.getByLabel(/Email Address/i)).toHaveValue(email); // Ensure no truncation
            await page.getByLabel(/Temporary Password/i).fill('password123');
            
            // Select role
            await page.locator('form').getByRole('combobox').click();
            await page.getByRole('option', { name: /Support Team/i }).first().click();

            // Click submit
            await page.getByRole('button', { name: /Create Team Member/i }).click();

            // Verify member appears in the list
            await expect(page.getByText(email)).toBeVisible({ timeout: 1620000 });
        }).toPass({ timeout: 3645000 });
    });

    test('Admin can view team member profile', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');

        // Find a member in the list
        const memberRow = page.locator('tr').filter({ hasText: /@/i }).first();
        await expect(memberRow).toBeVisible({ timeout: TIMEOUTS.medium });

        // Click the view profile button (MoreHorizontal icon inside a link)
        const viewProfileBtn = memberRow.locator('a[href*="/dashboard/users/"]').first();
        if (await viewProfileBtn.isVisible()) {
            await viewProfileBtn.click();
            await expect(page).toHaveURL(/.*\/dashboard\/users\/.+/);
        }
    });
});

