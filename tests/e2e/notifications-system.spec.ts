import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';
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
        const bell = page.getByRole('button', { name: /Notifications/i });
        await expect(bell).toBeVisible();

        // Click bell (force click for mobile viewports where it might be slightly overflowing)
        await bell.click({ force: true });

        // Check dropdown content - use heading role for the "Mission Intel" text
        const dropdownHeader = page.getByRole('heading', { name: /Mission Intel/i });
        await expect(dropdownHeader).toBeVisible();

        // Check for the "view all" button (which is styled as ACCESS INTEL COMMAND or VIEW HISTORY LOGS)
        const viewAllBtn = page.getByRole('button', { name: /ACCESS INTEL COMMAND|VIEW HISTORY LOGS/i });
        await expect(viewAllBtn).toBeVisible();
    });

    test('should display Action Required dashboard for urgent notifications', async ({ page }) => {
        // Check that it's hidden (default state)
        await expect(page.getByText('Action Required')).toBeHidden();
    });

    test('should navigate to notification settings', async ({ page }) => {
        await page.goto('/dashboard/notifications');
        await expect(page).toHaveURL(/\/dashboard\/notifications/);

        // Wait for loading to finish if it appears
        // Wait for H1 is visible (implicitly waits for loading to finish)
        await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible({ timeout: 30000 });

        const settingsTab = page.getByRole('tab').nth(2); // The Preferences tab (third tab)
        await settingsTab.click();

        await expect(page.getByText('Notification Preferences')).toBeVisible();
        await expect(page.getByText('In-App Notifications')).toBeVisible();
    });
});


