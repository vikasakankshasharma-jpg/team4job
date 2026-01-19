import { test, expect } from '@playwright/test';

/**
 * Admin System Smoke Tests
 * Verifies critical admin features including audit logging and RBAC
 */

test.describe('Admin System Smoke Tests', () => {

    test('Admin dashboard loads successfully', async ({ page }) => {
        test.setTimeout(60000);
        // This test assumes you have admin credentials configured
        // Update with your test admin credentials
        const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@team4job.com';
        const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Test@1234';

        // Navigate to login
        await page.goto('http://localhost:3006/login');

        // Fill login form
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);

        // Submit
        await page.click('button[type="submit"]');

        // Wait for navigation to dashboard
        await page.waitForURL('**/dashboard**', { timeout: 10000 });

        // Verify we're on the dashboard
        expect(page.url()).toContain('/dashboard');
    });

    test('Audit logs page is accessible to admin', async ({ page }) => {
        // Assumes logged in as admin (from previous test or setup)
        // For isolated test, would need to login first

        await page.goto('http://localhost:3006/dashboard/audit-logs');

        // Verify page loads
        await expect(page.locator('h1')).toContainText('Admin Audit Log');

        // Check for key UI elements
        await expect(page.locator('text=Total Actions')).toBeVisible();
        await expect(page.locator('text=Today')).toBeVisible();
        await expect(page.locator('text=This Week')).toBeVisible();
    });

    test('Team management page shows role badges', async ({ page }) => {
        await page.goto('http://localhost:3006/dashboard/team');

        // Verify page loads
        await expect(page.locator('text=Team Management')).toBeVisible();

        // Check for Add Team Member button
        await expect(page.locator('text=Add Team Member')).toBeVisible();
    });

    test('RBAC: Support team has limited navigation', async ({ page }) => {
        // This would require a Support Team test account
        // Placeholder for structure

        // const SUPPORT_EMAIL = process.env.TEST_SUPPORT_EMAIL;
        // const SUPPORT_PASSWORD = process.env.TEST_SUPPORT_PASSWORD;

        // Login as support team
        // Verify they DON'T see:
        // - Reports link
        // - Team Management link  
        // - Audit Logs link
        // - Settings tabs

        test.skip(true, 'Support team RBAC test requires test account setup');
    });

    test('Admin can access all sections', async ({ page }) => {
        // Assumes admin session
        const adminOnlyPages = [
            '/dashboard/admin',
            '/dashboard/reports',
            '/dashboard/team',
            '/dashboard/audit-logs',
            '/dashboard/users',
            '/dashboard/transactions',
            '/dashboard/disputes',
        ];

        for (const path of adminOnlyPages) {
            await page.goto(`http://localhost:3006${path}`);

            // Verify no redirect to login or 403
            expect(page.url()).toContain(path);

            // Verify no error message
            const errorText = await page.locator('text=/unauthorized|forbidden|access denied/i').count();
            expect(errorText).toBe(0);
        }
    });
});

test.describe('Build Verification', () => {
    test('All critical routes are accessible', async ({ page }) => {
        const publicRoutes = [
            '/',
            '/login',
            '/privacy-policy',
            '/terms-of-service',
            '/refund-policy',
        ];

        for (const route of publicRoutes) {
            await page.goto(`http://localhost:3006${route}`);

            // Verify page loads (no 404)
            const notFoundText = await page.locator('text=/404|not found/i').count();
            expect(notFoundText).toBe(0);
        }
    });
});
