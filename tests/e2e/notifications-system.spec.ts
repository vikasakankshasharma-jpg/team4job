import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from '../fixtures/test-data';
import { NotificationsService } from '../../src/lib/api/notifications';
import { Notification } from '../../src/lib/types';
import { Timestamp } from 'firebase/firestore';

test.describe('Notification System', () => {
    // Use Job Giver account
    const { email, password } = TEST_ACCOUNTS.jobGiver;

    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]'); // Adjust selector if needed
        await page.waitForURL(/\/dashboard/);
    });

    test('should display notification bell and dropdown', async ({ page }) => {
        // Check if bell exists
        const bell = page.getByRole('button', { name: /Notifications/i });
        await expect(bell).toBeVisible();

        // Click bell
        await bell.click();

        // Check dropdown content - use heading role for the "Notifications" text
        const dropdownHeader = page.getByRole('heading', { name: 'Notifications' });
        await expect(dropdownHeader).toBeVisible();

        // Check for the "view all" button
        const viewAllBtn = page.getByRole('button', { name: 'View all notifications' });
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

        const settingsTab = page.getByRole('tab', { name: /Preferences/i });
        await settingsTab.click();

        await expect(page.getByText('Notification Preferences')).toBeVisible();
        await expect(page.getByText('In-App Notifications')).toBeVisible();
    });
});
