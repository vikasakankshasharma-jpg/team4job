import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';

test.describe('Auth Smoke Tests — Client Wizard @smoke-auth', () => {
    test('Client can access Post Job wizard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();
        await helper.nav.goToPostJob();
        await expect(page).toHaveURL(/\/wizard/);
        await expect(page.getByText('Mission Orientation')).toBeVisible();
        await expect(page.locator('[data-testid*="-category-card"]').first()).toBeVisible();
    });
});
