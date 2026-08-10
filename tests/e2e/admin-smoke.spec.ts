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
        
        const viewportSize = page.viewportSize();
        const isMobile = viewportSize ? viewportSize.width < 640 : false;

        if (isMobile) {
            // On mobile, the sidebar (hidden sm:flex) is not rendered.
            // Verify the mobile bottom nav is present instead.
            await expect(page.locator('nav.sm\\:hidden').first()).toBeVisible({ timeout: 15000 });
        } else {
            // Wait for stable navigation elements in the sidebar
            await expect(page.getByTestId('nav-link-auditLog')).toBeVisible({ timeout: 15000 });
            await expect(page.getByTestId('nav-link-teamManagement')).toBeVisible({ timeout: 15000 });
            await expect(page.getByTestId('nav-link-users')).toBeVisible({ timeout: 15000 });
        }

        // Verify admin mode indicator if present
        const adminMode = page.locator('text=Admin Mode');
        if (await adminMode.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(adminMode).toBeVisible({ timeout: 10000 });
        }
    });

    test('Audit logs page is accessible to admin', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/audit-logs');
        
        // Wait for page content to load using stable selector
        await expect(page.getByRole('heading', { name: 'Admin Audit Log' })).toBeVisible({ timeout: 30000 });

        // Verify stats card "auditLogs.stats.total": "Total Actions"
        await expect(page.locator('text=Total Actions')).toBeVisible({ timeout: 15000 });
    });

    test('Team management page shows role badges', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');
        await helper.auth.waitForStability();
        
        // Wait for page content using stable button selector
        await expect(page.getByTestId('add-team-member-btn').or(page.getByText('Add Team Member'))).toBeVisible({ timeout: 30000 });

        // Verify common team member role indicators
        await expect(page.locator('text=Admin').first()).toBeVisible({ timeout: 15000 });
    });

    test('Admin can access all sections', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();

        const adminOnlyPages = [
            '/dashboard/admin',
            '/dashboard/reports',
            '/dashboard/users',
            '/dashboard/team',
            '/dashboard/all-jobs',
            '/dashboard/transactions',
            '/dashboard/subscription-plans',
            '/dashboard/coupons',
            '/dashboard/blacklist',
        ];

        for (const path of adminOnlyPages) {
            // Wait longer between navigations to handle Fast Refresh
            await page.waitForTimeout(2000);
            await page.goto(path);
            
            // Wait for page to stabilize after potential Fast Refresh
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(2000);

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
