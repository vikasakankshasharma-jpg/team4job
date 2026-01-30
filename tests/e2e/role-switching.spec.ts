import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

/**
 * Role Switching Test Suite
 * 
 * Verifies that a user with multiple roles can switch between them using the user menu.
 */
test.describe('Role Switching System', () => {
    let helper: TestHelper;

    const DUAL_ROLE_USER = {
        email: 'dualrole@example.com',
        password: 'Vikas@129229',
        displayName: 'Dual Role User'
    };

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        await helper.auth.clearAuthPersistence();
    });

    test('User with multiple roles can switch modes', async ({ page }) => {
        // 1. Login with the dual-role user
        console.log('Logging in as dual-role user...');
        await helper.auth.login(DUAL_ROLE_USER.email, DUAL_ROLE_USER.password);

        // 2. Initial state verification
        // By default, it might pick one or the other. Let's check what it is.
        await page.waitForTimeout(2000); // Wait for initial hydration/redirects

        // Open user menu to check current role
        await page.getByTestId('user-menu-trigger').click();

        // Check if "Current Mode" label is visible (indicates multiple roles)
        await expect(page.getByText('Current Mode')).toBeVisible();

        // Determine current role based on checked radio item
        const isJobGiver = await page.getByRole('menuitemradio', { name: 'Job Giver (Hiring)', checked: true }).isVisible();
        console.log(`Initial role is Job Giver: ${isJobGiver}`);

        // Close menu to reset state for switching
        await page.keyboard.press('Escape');

        if (isJobGiver) {
            // SWITCH TO INSTALLER
            console.log('Switching to Installer mode...');
            await helper.auth.ensureRole('Installer');

            // Verify Installer Dashboard
            await expect(page.getByText('Open Jobs')).toBeVisible({ timeout: 10000 });
            await expect(page.getByText('Earnings Overview')).toBeVisible().catch(() => console.log('Earnings Overview not found (optional)'));

            // Verify persistence after reload
            console.log('Reloading to verify persistence...');
            await page.reload();
            await expect(page.getByText('Open Jobs')).toBeVisible({ timeout: 10000 });

            // SWITCH BACK TO JOB GIVER
            console.log('Switching back to Job Giver mode...');
            await helper.auth.ensureRole('Job Giver');

            // Verify Job Giver Dashboard
            await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible({ timeout: 10000 });

        } else {
            // Initially Installer
            // SWITCH TO JOB GIVER
            console.log('Switching to Job Giver mode...');
            await helper.auth.ensureRole('Job Giver');

            // Verify Job Giver Dashboard
            await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible({ timeout: 10000 });

            // Verify persistence
            console.log('Reloading to verify persistence...');
            await page.reload();
            await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible({ timeout: 10000 });

            // SWITCH BACK TO INSTALLER
            console.log('Switching back to Installer mode...');
            await helper.auth.ensureRole('Installer');

            // Verify Installer Dashboard
            await expect(page.getByText('Open Jobs').first()).toBeVisible({ timeout: 10000 });
        }

        console.log('Role switching test passed successfully.');
    });

    test('Role-based route protection works', async ({ page }) => {
        // Login and ensure Installer role
        await helper.auth.login(DUAL_ROLE_USER.email, DUAL_ROLE_USER.password);
        await helper.auth.ensureRole('Installer');

        // Try to access a Job Giver only page (e.g., Post Job)
        console.log('Attempting to access restricted Job Giver page as Installer...');
        await page.goto('/dashboard/post-job');

        // Should be redirected to dashboard
        await page.waitForURL(/\/dashboard$/, { timeout: 10000 });
        console.log('Redirected to dashboard as expected.');

        // Now switch to Job Giver
        await helper.auth.ensureRole('Job Giver');

        // Try to access Post Job again
        console.log('Attempting to access Post Job page as Job Giver...');
        await page.goto('/dashboard/post-job');

        // Should NOT be redirected (should stay on post-job)
        await expect(page).toHaveURL(/\/dashboard\/post-job/);
        console.log('Access granted as expected.');
    });

});
