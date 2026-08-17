import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';

test.describe('Auth Smoke Tests — Client Login @smoke-auth', () => {
    test('Client can login and view dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(
            page.getByText('Post a Job').or(page.getByText('Active Jobs')).first()
        ).toBeAttached({ timeout: 270000 });
    });
});
