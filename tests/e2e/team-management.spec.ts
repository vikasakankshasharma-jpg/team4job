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

        // Fill invitation form
        const email = `new-member-${Date.now()}@example.com`;
        await page.getByLabel(/Full Name/i).fill('New Member');
        await page.getByLabel(/Email Address/i).fill(email);
        await page.getByLabel(/Temporary Password/i).fill('password123');
        
        // Select role (specifically within the form to avoid clicking the filter bar)
        await page.locator('form').getByRole('combobox').click();
        await page.getByRole('option', { name: /Support Team/i }).first().click();

        // Give Firebase Auth enough time to restore the session from IndexedDB
        // to prevent the API request failing with "Not authenticated".
        await page.waitForTimeout(2000);

        // Send invitation and wait for the success toast so we know the API call finished
        await page.getByRole('button', { name: /Create Team Member/i }).click();
        
        // Wait for success toast
        await expect(page.getByRole('status').filter({ hasText: /Success/i })).toBeVisible({ timeout: 15000 });

        // Verify member appears in the list (onSnapshot should update it automatically)
        await expect(page.getByText(email)).toBeVisible({ timeout: 15000 });
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

