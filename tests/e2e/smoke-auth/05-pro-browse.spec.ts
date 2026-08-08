import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';

test.describe('Auth Smoke Tests — Professional Browse @smoke-auth', () => {
    test('Professional can access Browse Jobs page', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await helper.nav.goToBrowseJobs();
        await expect(page).toHaveURL(/\/jobs/);
        await expect(
            page.getByTestId('nav-link-browseJobs').or(page.getByText('Browse Jobs')).first()
        ).toBeAttached({ timeout: 90000 });
    });
});
