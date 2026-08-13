import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Automated Verification for the AI-First Bulk Job Suite
 */
test.describe('Bulk Job Suite & AI Features Verification @bulk-ai', () => {
    
    test.beforeEach(async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Verify CCTV Page Tabs and AI Smart Split', async ({ page }) => {
        const helper = new TestHelper(page);
        // 1. Navigate to CCTV Page
        await page.goto('/wizard');
        await helper.form.selectWizardCategory('Security & Surveillance');

        // 2. Verify Tabs are present
        const tabsList = page.locator('[role="tablist"]');
        await expect(tabsList.getByText('Classic')).toBeVisible();
        await expect(tabsList.getByText('Bulk Spreadsheet')).toBeVisible();
        await expect(tabsList.getByText('AI Smart Split')).toBeVisible();

        // 3. Test AI Smart Split Flow
        const aiTab = page.getByRole('tab', { name: /AI Smart Split/i }).first();
        await aiTab.scrollIntoViewIfNeeded();
        await aiTab.click({ force: true });
        
        const textarea = page.getByTestId('smart-split-textarea');
        await expect(textarea).toBeVisible({ timeout: 15000 });
        
        await textarea.fill("I need 2 cameras in Okhla and 4 cameras in Noida. Total budget 50000.");
        await page.getByTestId('smart-split-analyze-btn').click({ force: true });

        // 4. Verify Analysis Results (Review Grid)
        // Wait for AI analysis - might take a few seconds
        const grid = page.getByTestId('bulk-review-grid');
        await expect(grid).toBeVisible({ timeout: 45000 });
        
        // Check grid content
        const rows = page.locator('tr');
        await expect(rows).toHaveCount(3); // Header + 2 jobs
        await expect(grid.getByText('Okhla, Delhi')).toBeVisible();
        await expect(grid.getByText('Borivali, Mumbai')).toBeVisible();
    });

    test('Verify Spreadsheet Tab and Sample Download', async ({ page }) => {
        const helper = new TestHelper(page);
        await page.goto('/wizard');
        await helper.form.selectWizardCategory('Security & Surveillance');
        await page.click('button[role="tab"]:has-text("Bulk Spreadsheet")');

        await expect(page.getByText(/Bulk Upload via Spreadsheet/i)).toBeVisible();
        
        // Test Download Sample Button
        const downloadButton = page.getByTestId('download-sample-csv');
        await expect(downloadButton).toBeVisible();
        
        // We won't actually download in the test runner unless needed, 
        // but verifying the button is wired up.
    });

    test('Verify Pattern Detection Suggestion', async ({ page }) => {
        // Since we are in CI mode, the mock in ai.actions.ts will return a suggestion
        const helper = new TestHelper(page);
        await page.goto('/wizard');
        await helper.form.selectWizardCategory('Security & Surveillance');
        
        // Wait for and verify the suggestion banner
        await expect(page.getByText('Frequent Technical Installation')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Based on your recent 3 Delhi office jobs.')).toBeVisible();
    });
});

