import { test, expect } from '@playwright/test';

/**
 * HTTP-only Smoke Tests — NO Firebase emulator required.
 * These tests only verify that the Next.js server is serving pages
 * correctly and that basic routing/redirect logic works.
 *
 * Runs in parallel with Build Application (no emulator = no Java = fast).
 */

test.describe('HTTP Smoke Tests @smoke-http', () => {

    test('Home page loads and renders an H1', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('Unauthenticated user is redirected to login', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
    });

    test('Login page loads correctly', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
        await expect(page.locator('input[name="identifier"]').or(
            page.locator('input[type="email"]')
        ).first()).toBeVisible({ timeout: 30000 });
    });

    test('Invalid login shows an error and stays on login page', async ({ page }) => {
        await page.goto('/login');
        const emailInput = page.locator('input[name="identifier"]');
        await emailInput.waitFor({ state: 'visible', timeout: 30000 });
        await emailInput.fill('invalid-user@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]:has-text("Log In")');

        // Should stay on login page with an error visible
        await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 30000 });
        await expect(page).toHaveURL(/\/login/);
    });

    test('Application loads without critical console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });
        await page.waitForTimeout(2000);

        const criticalErrors = errors.filter(err =>
            !err.includes('favicon') &&
            !err.includes('Fast Refresh') &&
            !err.includes('404') &&
            !err.includes('Not Found') &&
            !err.includes('WebSocket') &&
            !err.includes('eval() is not supported in this environment') &&
            !err.includes('Google Maps JavaScript API error') &&
            !err.includes('ExpiredKeyMapError') &&
            !err.includes('_vercel/speed-insights') &&
            !err.includes('_vercel/insights') &&
            !err.includes('Changing an uncontrolled input') &&
            !err.includes('eval() is not supported')
        );

        expect(criticalErrors).toHaveLength(0);
    });
});
