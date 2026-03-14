import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('Coupons & Discounts', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Admin can create and view coupons', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/coupons');
        await expect(page).toHaveURL(/.*\/dashboard\/coupons/);
    });

});
