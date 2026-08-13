import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { execSync } from 'child_process';

/**
 * E2E Test: Invoice Generation
 * Verifies that invoices can be generated and viewed for completed jobs
 */

test.describe('Invoice Generation E2E', () => {
    test('Client can view invoice for completed job', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestHelper(page);

        console.log('--- START: Invoice Generation Test ---');

        // 1. Login first to ensure DB is seeded and not cleared afterwards
        await helper.auth.loginAsClient();

        console.log('Seeding completed job...');
        let seededJobId: string;
        try {
            const seedOutput = execSync('npx --no-install tsx scripts/seed-completed-job.ts').toString();
            seededJobId = seedOutput.trim().split('\n').pop() || '';
            console.log(`Seeded Job ID: ${seededJobId}`);
        } catch (error) {
            console.error('Failed to seed completed job', error);
            throw error;
        }

        // 2. Navigate directly to the seeded job
        await page.goto(`/dashboard/jobs/${seededJobId}`);

        // Wait for hydration and data load
        await page.waitForTimeout(3000);
        await expect(page.getByTestId('job-status-badge')).toContainText(/Completed|Mission Accomplished/i, { timeout: 30000 });

        // 3. Confirm download button (which actually opens print view) is visible
        const downloadBtn = page.getByTestId('download-invoice-button');
        await expect(downloadBtn).toBeVisible();

        // 4. In our current implementation, this opens a new tab with a print view
        // Instead of waiting for a download event (which window.print doesn't trigger),
        // we verify the link and that the new page loads correctly.
        const [invoicePage] = await Promise.all([
            context.waitForEvent('page'),
            downloadBtn.click()
        ]);

        await invoicePage.waitForLoadState('domcontentloaded');
        await expect(invoicePage).toHaveURL(new RegExp(`/dashboard/jobs/${seededJobId}/invoice`));

        // Check for invoice content on the new page
        await expect(invoicePage.locator('h1').first()).toBeVisible({ timeout: 15000 });
        await expect(invoicePage.getByRole('button', { name: /Print|Download Mission Invoice/i })).toBeVisible({ timeout: 30000 });

        console.log(`[PASS] Invoice page loaded successfully for ${seededJobId}`);

        await context.close();
    });
});


