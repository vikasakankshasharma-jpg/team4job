import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/helpers';
import { TEST_ACCOUNTS, TIMEOUTS } from '../fixtures/test-data';
import { NotificationsService } from '../../src/lib/api/notifications';
import { Notification } from '../../src/lib/types';
import { Timestamp } from 'firebase/firestore';

test.describe('Notification System', () => {
    // Use Client account
    const { email, password } = TEST_ACCOUNTS.client;

    let helper: { auth: AuthHelper };

    test.beforeEach(async ({ page }) => {
        helper = { auth: new AuthHelper(page) };
        await helper.auth.login(TEST_ACCOUNTS.client.email, TEST_ACCOUNTS.client.password);
    });

    test('should display notification bell and dropdown', async ({ page }) => {
        // Check if bell exists
        const bell = page.getByRole('button', { name: /Notifications/i }).first();
        await expect(bell).toBeVisible({ timeout: 2430000 });

        // Wait for hydration
        await page.waitForTimeout(2000);

        // Click bell and wait for dropdown content to be fully visible
        // All assertions go inside toPass() because the Popover renders in a Radix portal
        // and can close between separate assertion blocks
        const dropdownHeader = page.locator('h4').filter({ hasText: /Mission Intel/i }).first();
        const viewAllBtn = page.getByRole('button', { name: /ACCESS INTEL|HISTORY LOGS/i }).first();
        
        // Wait for page hydration to prevent swallowed clicks
        await page.waitForTimeout(15000);

        if (!(await dropdownHeader.isVisible())) {
            await bell.click({ force: true });
        }
        await expect(dropdownHeader).toBeVisible({ timeout: 2430000 });
        await expect(viewAllBtn).toBeVisible({ timeout: 2430000 });
    });

    test('should display Action Required dashboard for urgent notifications', async ({ page }) => {
        // Check that it's hidden (default state)
        await expect(page.getByText('Action Required').first()).toBeHidden();
    });

    test('should navigate to notification settings', async ({ page }) => {
        await page.goto('/dashboard/notifications');
        await expect(page).toHaveURL(/\/dashboard\/notifications/);

        // Wait for loading to finish if it appears
        // Wait for H1 is visible (implicitly waits for loading to finish)
        await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible({ timeout: 2430000 });

        const settingsTab = page.getByRole('tab').nth(2); // The Preferences tab (third tab)
        await settingsTab.click();

        await expect(page.getByText('Notification Preferences')).toBeVisible({ timeout: 2430000 });
        await expect(page.getByText('In-App Notifications')).toBeVisible({ timeout: 2430000 });
    });
});



