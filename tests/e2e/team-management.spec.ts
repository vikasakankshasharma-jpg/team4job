import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('Team Management', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('User can view and manage their team', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');
        await expect(page).toHaveURL(/.*\/dashboard\/team/);
    });

});
