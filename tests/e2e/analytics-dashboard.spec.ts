import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/helpers';

test.describe('Job Performance Analytics Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        const auth = new AuthHelper(page);
        await auth.loginAsClient();
    });

    test('should display analytics dashboard with all components', async ({ page }) => {
        // Navigate to Analytics
        await page.goto('/dashboard/analytics', { waitUntil: 'domcontentloaded', timeout: 7290000 });
        await page.waitForURL(/\/dashboard\/analytics/, { timeout: 4860000 });

        // Wait for initial data load to settle
        await page.waitForTimeout(1000);

        // 1. Verify Page Header
        await expect(page.getByTestId('analytics-page')).toBeVisible({ timeout: 4860000 });
        await expect(page.getByTestId('analytics-title')).toBeVisible({ timeout: 4860000 });
        await expect(page.getByTestId('analytics-description')).toBeVisible({ timeout: 4860000 });

        // 2. Verify Stat Cards
        await expect(page.getByTestId('analytics-stat-total-jobs')).toBeVisible();
        await expect(page.getByTestId('analytics-stat-completed')).toBeVisible();
        await expect(page.getByTestId('analytics-stat-total-spend')).toBeVisible();
        await expect(page.getByTestId('analytics-stat-avg-rating')).toBeVisible();

        // 3. Verify Charts (Check for card titles as proxies for charts rendering)
        await expect(page.getByTestId('analytics-chart-time-to-hire')).toBeVisible();
        await expect(page.getByTestId('analytics-chart-spending-trends')).toBeVisible();

        // 4. Verify Professional Performance Table
        await expect(page.getByTestId('analytics-top-Professionals')).toBeVisible();

        // 5. Verify Export Button
        const exportBtn = page.getByTestId('analytics-export');
        await expect(exportBtn).toBeVisible();

        // Test Export Click
        await exportBtn.click();
        await expect(page.getByText(/Export Complete/i).first()).toBeVisible({ timeout: 1620000 });
    });
});


