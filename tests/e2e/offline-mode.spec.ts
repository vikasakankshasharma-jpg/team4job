import { test, expect } from '@playwright/test';

test.describe('Offline Mode (PWA)', () => {

    test('Offline detector shows alert when network is disconnected', async ({ page }) => {
        await page.goto('/');

        // Go offline
        console.log('Simulating offline state...');
        await page.context().setOffline(true);

        // Verify the OfflineDetector component triggers a UI update
        // The detector typically shows a banner or toast
        const offlineBanner = page.locator('text=/You are currently offline|No internet connection/i').first()
            .or(page.locator('[data-testid="offline-alert"]'));
        
        await expect(offlineBanner).toBeVisible({ timeout: 10000 });
        console.log('Offline banner verified.');

        // Restore online status
        console.log('Restoring online state...');
        await page.context().setOffline(false);

        // Verify the banner disappears
        await expect(offlineBanner).not.toBeVisible({ timeout: 10000 });
        console.log('Online state restoration verified.');
    });

    test('Critical actions are blocked or warn when offline', async ({ page }) => {
        await page.goto('/login');
        // Wait for the page to fully hydrate before going offline to avoid detached DOM
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1500);

        await page.context().setOffline(true);

        const loginBtn = page.getByRole('button', { name: /Log In/i }).first();
        if (await loginBtn.isVisible()) {
            // Re-query after offline to avoid stale element reference
            await page.getByRole('button', { name: /Log In/i }).first().click({ force: true });
            
            // Should show an error or be disabled
            const errorMsg = page.locator('text=/offline|network|connection/i').first();
            await expect(errorMsg).toBeVisible({ timeout: 5000 });
        }

        await page.context().setOffline(false);
    });
});

