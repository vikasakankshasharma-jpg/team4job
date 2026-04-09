import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Visual Regression Testing
 * Captures screenshots and compares against baselines
 */

test.describe('Visual Regression Tests', () => {
    test.describe.configure({ mode: 'parallel' });
    test('Landing page should match baseline', async ({ page }) => {
        const helper = new TestHelper(page);
        await page.goto('/');
        await helper.nav.injectCookieHide();
        await page.waitForLoadState('networkidle');

        // Take screenshot and compare
        await expect(page).toHaveScreenshot('landing-page.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('Login page should match baseline', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('login-page.png', {
            maxDiffPixels: 50,
        });
    });

    test('Signup page should match baseline', async ({ page }) => {
        await page.goto('/signup');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('signup-page.png', {
            maxDiffPixels: 50,
        });
    });

    test('Installer dashboard should match baseline', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await helper.nav.injectCookieHide();
        await page.waitForLoadState('networkidle');

        // Wait for charts to render
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('installer-dashboard.png', {
            fullPage: true,
            maxDiffPixels: 200, // Charts may have slight variations
        });
    });

    test('Client dashboard should match baseline', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();
        await helper.nav.injectCookieHide();
        await page.waitForLoadState('networkidle');

        // Wait for charts to render
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('jobgiver-dashboard.png', {
            fullPage: true,
            maxDiffPixels: 200,
        });
    });

    test('Job listing page should match baseline', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await helper.nav.goToBrowseJobs();
        await helper.nav.injectCookieHide();

        await page.goto('/dashboard/jobs');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('job-listing.png', {
            fullPage: true,
            maxDiffPixels: 150,
        });
    });

    test('Mobile view - Landing page should match baseline', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('landing-page-mobile.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('Mobile view - Dashboard should match baseline', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await helper.nav.injectCookieHide();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await expect(page).toHaveScreenshot('dashboard-mobile.png', {
            fullPage: true,
            maxDiffPixels: 200,
        });
    });

    test('Dark mode should match baseline', async ({ page }) => {
        await page.goto('/');

        // Toggle dark mode
        await page.evaluate(() => {
            document.documentElement.classList.add('dark');
        });

        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('landing-page-dark.png', {
            fullPage: true,
            maxDiffPixels: 150,
        });
    });
});


