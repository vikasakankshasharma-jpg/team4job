import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

/**
 * Role Redirect Validation
 * Verifies that users are redirected away from pages they shouldn't access.
 */
test.describe('Role Based Redirects', () => {

    // Test Case 1: Client trying to access Professional Page
    test('Client is redirected from Professional-only pages', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Client
        await helper.auth.loginAsClient();

        // Wait for dashboard to ensure login is complete
        await expect(page).toHaveURL(/\/dashboard/);

        // Attempt to go to an Professional-only page
        const unauthorizedPage = '/dashboard/my-bids';
        await page.goto(unauthorizedPage);

        // Verify redirect happens (back to dashboard or allowed page)
        // We expect it to NOT be the unauthorized page
        await expect(page).not.toHaveURL(new RegExp(unauthorizedPage));
        await expect(page).toHaveURL(/\/dashboard/);
    });

    // Test Case 2: Professional trying to access Client Page
    test('Professional is redirected from Client-only pages', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Professional
        await helper.auth.loginAsProfessional();

        // Wait for dashboard
        await expect(page).toHaveURL(/\/dashboard/);

        // Attempt to go to a Client-only page
        const unauthorizedPage = '/dashboard/post-job';
        await page.goto(unauthorizedPage);

        // Verify redirect validation
        await expect(page).not.toHaveURL(new RegExp(unauthorizedPage));
        await expect(page).toHaveURL(/\/dashboard/);
    });

    // Test Case 3: Public Page access (should not redirect if already logged in unless it's login page)
    test('Logged in user redirected from /login to dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();

        // Try to go back to login
        await page.goto('/login');

        // Should be kicked back to dashboard
        await expect(page).toHaveURL(/\/dashboard/);
    });

});


