import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';

test.describe('Auth Smoke Tests — Professional Login @smoke-auth', () => {
    test('Professional can login and view dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(
            page.getByText('Browse Jobs').or(page.getByText('Open Jobs')).first()
        ).toBeAttached({ timeout: 90000 });
    });
});
