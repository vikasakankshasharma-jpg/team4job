import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

/**
 * Admin System Smoke Tests
 * Verifies critical admin features including audit logging and RBAC
 */

test.describe('Admin System Smoke Tests @smoke', () => {

    test('Admin dashboard loads successfully', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();

        // Wait for dashboard to handle multi-role switch or hydration
        await page.waitForURL(/\/dashboard/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Verify "Admin Mode" is visible in the header
        await expect(page.locator('text=Admin Mode')).toBeVisible({ timeout: 15000 });

        // Verify critical admin links are visible using data-testid
        await expect(page.getByTestId('nav-link-auditLog')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('nav-link-teamManagement')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('nav-link-users')).toBeVisible({ timeout: 15000 });
    });

    test('Audit logs page is accessible to admin', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/audit-logs');
        await page.waitForLoadState('networkidle');

        // Verify page title from en.json "auditLogs.title": "Admin Audit Log"
        await expect(page.getByRole('heading', { name: 'Admin Audit Log' })).toBeVisible({ timeout: 15000 });

        // Verify stats card "auditLogs.stats.total": "Total Actions"
        await expect(page.locator('text=Total Actions')).toBeVisible({ timeout: 15000 });
    });

    test('Team management page shows role badges', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');
        await page.waitForLoadState('networkidle');

        // Verify page loads - "Add Team Member" is currently hardcoded in TeamManagementCard
        await expect(page.locator('text=Add Team Member')).toBeVisible({ timeout: 15000 });

        // Verify common team member role indicators
        // We look for badges which are styled with specific colors
        await expect(page.locator('.badge, [role="status"]').filter({ hasText: /Admin|Support/ }).first()).toBeVisible();
    });

    test('Admin can access all sections', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();

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
            await page.goto(path);

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
            await page.goto(route);

            // Verify page loads (no 404)
            const notFoundText = await page.locator('text=/404|not found/i').count();
            expect(notFoundText).toBe(0);
        }
    });
});
