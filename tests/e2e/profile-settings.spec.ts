import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('Profile & Settings Management', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('User can manage their profile and settings', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard/profile');
        await expect(page).toHaveURL(/.*\/dashboard\/profile/);

        await page.goto('/dashboard/settings');
        await expect(page).toHaveURL(/.*\/dashboard\/settings/);
    });

});

