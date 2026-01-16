import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

test.describe('Job Performance Analytics Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Standard Login as Job Giver
        await page.goto('/login');
        await page.fill('input[type="email"]', TEST_ACCOUNTS.jobGiver.email);
        await page.fill('input[type="password"]', TEST_ACCOUNTS.jobGiver.password);
        await page.getByRole('button', { name: /Log In/i }).click();
        await page.waitForURL('/dashboard');
    });

    test('should display analytics dashboard with all components', async ({ page }) => {
        // Navigate to Analytics
        await page.goto('/dashboard/analytics');

        // 1. Verify Page Header
        await expect(page.getByRole('heading', { name: 'Project Analytics' })).toBeVisible();
        await expect(page.getByText('Insights into your hiring performance and spending')).toBeVisible();

        // 2. Verify Stat Cards
        await expect(page.getByText('Total Jobs')).toBeVisible();
        await expect(page.getByText('Completed')).toBeVisible();
        await expect(page.getByText('Total Spend')).toBeVisible();
        await expect(page.getByText('Avg Rating')).toBeVisible();

        // 3. Verify Charts (Check for card titles as proxies for charts rendering)
        await expect(page.getByText('Time to Hire')).toBeVisible();
        await expect(page.getByText('Spending Trends')).toBeVisible();

        // 4. Verify Installer Performance Table
        await expect(page.getByText('Top Installers')).toBeVisible();
        await expect(page.getByRole('table')).toBeVisible();

        // 5. Verify Export Button
        const exportBtn = page.getByRole('button', { name: 'Export CSV' });
        await expect(exportBtn).toBeVisible();

        // Test Export Click
        await exportBtn.click();
        await expect(page.getByText('Export started')).toBeVisible();
    });
});
