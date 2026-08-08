import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';

test.describe('Auth Smoke Tests — Admin Login @smoke-auth', () => {
    test('Admin can login and view dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByTestId('nav-link-auditLog')).toBeAttached({ timeout: 90000 });
    });
});
