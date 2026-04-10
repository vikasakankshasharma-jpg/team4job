import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Smoke Tests - Quick validation of critical functionality
 */

test.describe('Smoke Tests @smoke', () => {
    test.describe.configure({ mode: 'parallel' });
    test('User can login as Client', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsClient();
        await expect(page).toHaveURL(/\/dashboard/);
        
        // Verify we're on dashboard - look for Client-specific navigation
        await expect(page.getByText('Post a Job').or(page.getByText('Active Jobs')).first()).toBeVisible({ timeout: 90000 });
    });

    test('User can login as Professional', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsProfessional();
        await expect(page).toHaveURL(/\/dashboard/);
        
        // Verify we're on dashboard - look for Professional-specific navigation
        await expect(page.getByText('Browse Jobs').or(page.getByText('Open Jobs')).first()).toBeVisible({ timeout: 90000 });
    });

    test('User can login as Admin', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsAdmin();
        await expect(page).toHaveURL(/\/dashboard/);
        
        // Verify we're on dashboard - admin sidebar links are stable
        await expect(page.getByTestId('nav-link-auditLog')).toBeVisible({ timeout: 90000 });
    });

    test('Client can access Post Job page', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsClient();
        await helper.nav.goToPostJob();

        await expect(page).toHaveURL(/\/wizard/);
        
        // Verify wizard starts with category selection
        await expect(page.getByText('Mission Orientation')).toBeVisible();
        await expect(page.locator('[data-testid*="-category-card"]').first()).toBeVisible();
    });

    test('Professional can access Browse Jobs page', async ({ page }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsProfessional();
        await helper.nav.goToBrowseJobs();

        await expect(page).toHaveURL(/\/jobs/);
        
        // Look for page heading or navigation element using stable selectors
        await expect(page.getByTestId('nav-link-browseJobs').or(page.getByText('Browse Jobs')).first()).toBeVisible({ timeout: 90000 });
    });

    test('Invalid login shows error', async ({ page }) => {
        const helper = new TestHelper(page);
        // Ensure we are logged out first so we can see the login form
        await helper.auth.logout();

        await page.goto('/login');
        // Use the same reliable selector as AuthHelper
        const emailInput = page.locator('input[name="identifier"]');
        await emailInput.waitFor({ state: 'visible' });
        await emailInput.fill('invalid@example.com');

        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]:has-text("Log In")');

        // Should show error and stay on login page
        // Look for error toast notification
        await expect(page.locator('[role="status"]').first()).toBeVisible();
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
        // Use visual indicator instead of networkidle which is flaky in CI due to analytics/background polling
        await page.waitForSelector('h1', { state: 'visible' });
        // Short grace period to catch immediate load errors
        await page.waitForTimeout(2000);

        //Filter out known acceptable errors (like favicon 404, resource loading issues)
        const criticalErrors = errors.filter(err =>
            !err.includes('favicon') &&
            !err.includes('Fast Refresh') &&
            !err.includes('404') &&
            !err.includes('Not Found') &&
            !err.includes('Google Maps JavaScript API error') && // Ignore expired key in CI
            !err.includes('ExpiredKeyMapError') &&
            !err.includes('_vercel/speed-insights') &&
            !err.includes('_vercel/insights')
        );

        expect(criticalErrors).toHaveLength(0);
    });
});


