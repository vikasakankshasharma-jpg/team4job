import { test, expect } from '@playwright/test';

test.describe('Offline Mode (PWA)', () => {

    test('Offline detector shows alert when network is disconnected', async ({ page }) => {
        await page.goto('/');

        // Go offline
        await page.context().setOffline(true);

        // Need to check if the OfflineDetector component triggers a UI update
        // Example: await expect(page.locator('text=You are currently offline')).toBeVisible();

        // Restore online status
        await page.context().setOffline(false);
    });

});
