import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Smoke Tests - Quick validation of critical functionality
 */

test.describe('Smoke Tests', () => {
    test('User can login as Job Giver', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsJobGiver();
        await expect(page).toHaveURL(/\/dashboard/);
        // Verify we're on dashboard - look for Job Giver-specific navigation
        await expect(page.locator('a:has-text("Post a Job")').first()).toBeVisible({ timeout: 10000 });
    });

    test('User can login as Installer', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsInstaller();
        await expect(page).toHaveURL(/\/dashboard/);
        // Verify we're on dashboard - look for common dashboard elements
        await expect(page.locator('text=Browse Jobs').first()).toBeVisible({ timeout: 10000 });
    });

    test('User can login as Admin', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsAdmin();
        await expect(page).toHaveURL(/\/dashboard/);
        // Verify we're on dashboard - look for Admin-specific element
        await expect(page.locator('a:has-text("All Jobs")').first()).toBeVisible({ timeout: 10000 });
    });

    test('Job Giver can access Post Job page', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsJobGiver();
        await helper.nav.goToPostJob();

        await expect(page).toHaveURL(/\/post-job/);
        await expect(page.locator('text=Job Title').or(page.locator('label:has-text("Job Title")'))).toBeVisible();
        await expect(page.locator('text=Job Description').or(page.locator('label:has-text("Job Description")'))).toBeVisible();
    });

    test('Installer can access Browse Jobs page', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsInstaller();
        await helper.nav.goToBrowseJobs();

        await expect(page).toHaveURL(/\/jobs/);
        // Look for page heading or navigation element
        await expect(page.locator('a:has-text("Browse Jobs")').first()).toBeVisible();
    });

    test('Invalid login shows error', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'invalid@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]:has-text("Log In")');

        // Should show error and stay on login page
        // Look for error toast notification
        await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL(/\/login/);
    });

    test('Unauthenticated user redirected to login', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('Application loads without console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Filter out known acceptable errors (like favicon 404)
        const criticalErrors = errors.filter(err =>
            !err.includes('favicon') &&
            !err.includes('Fast Refresh')
        );

        expect(criticalErrors).toHaveLength(0);
    });
});
