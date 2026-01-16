import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('UX Enhancements - Visual Verification', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        await helper.auth.loginAsInstaller();
        await helper.nav.goToBrowseJobs();
    });

    test('Tabs have correct touch target size', async ({ page }) => {
        const tab = page.locator('[role="tab"]:has-text("Near You")');
        // Wait for it to be visible
        await expect(tab).toBeVisible({ timeout: 10000 });

        const box = await tab.boundingBox();
        if (box) {
            console.log(`[Test] Tab height: ${box.height}px`);
            // Should be >= 44px (we added min-h-[44px])
            expect(box.height).toBeGreaterThanOrEqual(44);
        }
    });

    test('No significant horizontal scroll on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        // Wait for resize
        await page.waitForTimeout(1000);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

        console.log(`[Test] Scroll: ${scrollWidth}, Client: ${clientWidth}`);
        // Allow small buffer for scrollbar (usually 15-20px)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
    });
});
