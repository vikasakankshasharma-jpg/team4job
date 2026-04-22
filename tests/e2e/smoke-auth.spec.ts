import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

/**
 * Auth Smoke Tests — Requires Firebase emulator.
 * These tests verify that the authentication flows work end-to-end
 * and that role-based navigation is functional.
 *
 * Runs after lint-and-typecheck once the emulator is up.
 */

test.describe('Auth Smoke Tests @smoke-auth', () => {

    test('Client can login and view dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(
            page.getByText('Post a Job').or(page.getByText('Active Jobs')).first()
        ).toBeVisible({ timeout: 90000 });
    });

    test('Professional can login and view dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(
            page.getByText('Browse Jobs').or(page.getByText('Open Jobs')).first()
        ).toBeVisible({ timeout: 90000 });
    });

    test('Admin can login and view dashboard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByTestId('nav-link-auditLog')).toBeVisible({ timeout: 90000 });
    });

    test('Client can access Post Job wizard', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();
        await helper.nav.goToPostJob();
        await expect(page).toHaveURL(/\/wizard/);
        await expect(page.getByText('Mission Orientation')).toBeVisible();
        await expect(page.locator('[data-testid*="-category-card"]').first()).toBeVisible();
    });

    test('Professional can access Browse Jobs page', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await helper.nav.goToBrowseJobs();
        await expect(page).toHaveURL(/\/jobs/);
        await expect(
            page.getByTestId('nav-link-browseJobs').or(page.getByText('Browse Jobs')).first()
        ).toBeVisible({ timeout: 90000 });
    });
});
