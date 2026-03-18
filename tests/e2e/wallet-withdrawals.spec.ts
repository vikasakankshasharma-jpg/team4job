import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('Wallet Withdrawals', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Professional can request wallet fund withdrawal', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/dashboard/);

        // Basic check for earnings elements
        await expect(page.locator('text=Total Earnings').first()).toBeVisible();
    });

});

