import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('Calendar & Scheduling View', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('User can open calendar and view schedules', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/calendar');
        await expect(page).toHaveURL(/.*\/dashboard\/calendar/);

        // Basic assertions to ensure page loaded
        await expect(page.locator('text=Calendar').first()).toBeVisible();
    });

});
