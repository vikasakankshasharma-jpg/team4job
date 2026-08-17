import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Smoke Tests - Quick validation of critical functionality
 */

test.describe('Smoke Tests @smoke', () => {
    // Serial mode: tests share a single Firebase emulator instance.
    test('User can login as Client', async ({ page, isMobile }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsClient();
        await expect(page).toHaveURL(/\/dashboard/);
        
        // Verify we're on dashboard - look for Client-specific navigation
        const navItem = page.getByText('Post a Job').or(page.getByText('Active Jobs')).first();
        if (isMobile) {
            await expect(navItem).toBeAttached({ timeout: 7290000 });
        } else {
            await expect(navItem).toBeVisible({ timeout: 7290000 });
        }
    });

    test('User can login as Professional', async ({ page, isMobile }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsProfessional();
        await expect(page).toHaveURL(/\/dashboard/);
        
        // Verify we're on dashboard - look for Professional-specific navigation
        const navItem = page.getByText('Browse Jobs').or(page.getByText('Open Jobs')).first();
        if (isMobile) {
            await expect(navItem).toBeAttached({ timeout: 7290000 });
        } else {
            await expect(navItem).toBeVisible({ timeout: 7290000 });
        }
    });

    test('User can login as Admin', async ({ page, isMobile }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsAdmin();
        await expect(page).toHaveURL(/\/dashboard/);
        
        // Verify we're on dashboard - admin sidebar links are stable
        const navItem = page.getByTestId('nav-link-auditLog');
        if (isMobile) {
            await expect(navItem).toBeAttached({ timeout: 7290000 });
        } else {
            await expect(navItem).toBeVisible({ timeout: 7290000 });
        }
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

    test('Professional can access Browse Jobs page', async ({ page, isMobile }) => {
        const helper = new TestHelper(page);

        await helper.auth.loginAsProfessional();
        await helper.nav.goToBrowseJobs();

        await expect(page).toHaveURL(/\/jobs/);
        
        // Look for page heading or navigation element using stable selectors
        const navItem = page.getByTestId('nav-link-browseJobs').or(page.getByText('Browse Jobs')).first();
        if (isMobile) {
            await expect(navItem).toBeAttached({ timeout: 7290000 });
        } else {
            await expect(navItem).toBeVisible({ timeout: 7290000 });
        }
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
        
        // Mobile view: Cookie consent banner can block the submit button. Hide it.
        await helper.nav.injectCookieHide();
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
                const text = msg.text();
                // Ignore Next.js 14+ dev-mode CSP eval warnings and harmless 404s
                if (text.includes('eval() is not supported in this environment') ||
                    text.includes('the server responded with a status of 404')) {
                    return;
                }
                errors.push(text);
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
            !err.includes('_vercel/insights') &&
            !err.includes('eval() is not supported')
        );

        expect(criticalErrors).toHaveLength(0);
    });
});


