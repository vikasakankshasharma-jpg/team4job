import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

/**
 * Role Redirect Validation
 * Verifies that users are redirected away from pages they shouldn't access.
 */
test.describe('Role Based Redirects', () => {

    // Test Case 1: Job Giver trying to access Installer Page
    test('Job Giver is redirected from Installer-only pages', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Job Giver
        await helper.auth.loginAsJobGiver();

        // Wait for dashboard to ensure login is complete
        await expect(page).toHaveURL(/\/dashboard/);

        // Attempt to go to an Installer-only page
        const unauthorizedPage = '/dashboard/my-bids';
        await page.goto(unauthorizedPage);

        // Verify redirect happens (back to dashboard or allowed page)
        // We expect it to NOT be the unauthorized page
        await expect(page).not.toHaveURL(new RegExp(unauthorizedPage));
        await expect(page).toHaveURL(/\/dashboard/);
    });

    // Test Case 2: Installer trying to access Job Giver Page
    test('Installer is redirected from Job Giver-only pages', async ({ page }) => {
        const helper = new TestHelper(page);

        // Login as Installer
        await helper.auth.loginAsInstaller();

        // Wait for dashboard
        await expect(page).toHaveURL(/\/dashboard/);

        // Attempt to go to a Job Giver-only page
        const unauthorizedPage = '/dashboard/post-job';
        await page.goto(unauthorizedPage);

        // Verify redirect validation
        await expect(page).not.toHaveURL(new RegExp(unauthorizedPage));
        await expect(page).toHaveURL(/\/dashboard/);
    });

    // Test Case 3: Public Page access (should not redirect if already logged in unless it's login page)
    test('Logged in user redirected from /login to dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsJobGiver();

        // Try to go back to login
        await page.goto('/login');

        // Should be kicked back to dashboard
        await expect(page).toHaveURL(/\/dashboard/);
    });

});
