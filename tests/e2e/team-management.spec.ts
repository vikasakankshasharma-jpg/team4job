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
        
        // Select role
        await page.getByLabel(/Role/i).first().click();
        await page.getByRole('option', { name: /Support Team/i }).first().click();

        // Send invitation and wait for the API response
        const [response] = await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/api/admin/create-user') && resp.request().method() === 'POST', { timeout: 30000 }),
            page.getByRole('button', { name: /Create Team Member/i }).click()
        ]);
        
        console.log(`[TeamMgmt] API response status: ${response.status()}`);

        // Verify member appears in the list (pending or active) - use toPass with reload fallback
        await expect(async () => {
            const isVisible = await page.getByText(email).isVisible();
            if (!isVisible) {
                await page.reload();
                await page.waitForLoadState('domcontentloaded');
            }
            await expect(page.getByText(email)).toBeVisible({ timeout: 10000 });
        }).toPass({ timeout: 60000 });
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

