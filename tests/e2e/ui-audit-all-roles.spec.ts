
import { test, expect, Page } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, TIMEOUTS } from '../fixtures/test-data';

/**
 * Pixel-Perfect UI Audit & Data Sync Master Suite
 * This suite verifies the Stitch Hybrid styling across all roles and screen sizes.
 */

const VIEWPORTS = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 800 }
];

test.describe('Phase 6: Comprehensive UI Audit & Data Sync', () => {
    // Shared state between tests if needed (serial mode for emulator stability)
    test.describe.configure({ mode: 'serial' });

    for (const viewport of VIEWPORTS) {
        test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
            test.use({ viewport: { width: viewport.width, height: viewport.height } });

            test(`[${viewport.name}] Customer Dashboard Visual Audit`, async ({ page }) => {
                const helper = new TestHelper(page);
                await helper.auth.loginAsClient();
                await helper.auth.waitForStability();
                
                // Assert key Stitch tokens are present in the DOM (hybrid wrapper check)
                // Use attribute-substring selectors because Tailwind opacity modifiers
                // (e.g. bg-surface-container-low/40) change the exact class string.
                const surfaceContainer = page.locator('[class*="bg-surface-container-low"], [class*="bg-surface-container"]').first();
                await expect(surfaceContainer).toBeVisible();

                // Capture screenshot for manual/visual verify
                await page.screenshot({ 
                    path: `test-results/audit/customer-dashboard-${viewport.name.toLowerCase()}.png`,
                    fullPage: true 
                });

                // Functional check: Navigation works
                await page.goto('/dashboard/posted-jobs');
                await expect(page).toHaveURL(/.*\/posted-jobs/);
                await page.screenshot({ 
                    path: `test-results/audit/customer-posted-jobs-${viewport.name.toLowerCase()}.png`,
                    fullPage: true 
                });
            });

            test(`[${viewport.name}] Professional Dashboard Visual Audit`, async ({ page }) => {
                const helper = new TestHelper(page);
                await helper.auth.loginAsProfessional();
                await helper.auth.waitForStability();

                // Check for Pro-specific Stitch patterns
                await expect(page.getByText(/Open Jobs|Browse Jobs/i).first()).toBeVisible();
                
                await page.screenshot({ 
                    path: `test-results/audit/pro-dashboard-${viewport.name.toLowerCase()}.png`,
                    fullPage: true 
                });

                // Check Profile Alignment
                await page.goto('/dashboard/profile');
                await expect(page.locator('h1, h2').filter({ hasText: /Profile/i }).first()).toBeVisible();
                await page.screenshot({ 
                    path: `test-results/audit/pro-profile-${viewport.name.toLowerCase()}.png`,
                    fullPage: true 
                });
            });

            if (viewport.name === 'Desktop') {
                test('[Desktop] Admin Dashboard & Analytics Audit', async ({ page }) => {
                    const helper = new TestHelper(page);
                    await helper.auth.loginAsAdmin();
                    await helper.auth.waitForStability();

                    // Admin specific pages
                    await page.goto('/dashboard/analytics');
                    await expect(page.locator('[class*="bg-surface-container-low"]').first()).toBeVisible();
                    await page.screenshot({ path: `test-results/audit/admin-analytics-desktop.png`, fullPage: true });

                    await page.goto('/dashboard/users');
                    await expect(page.locator('table')).toBeVisible();
                    await page.screenshot({ path: `test-results/audit/admin-users-desktop.png`, fullPage: true });
                });
            }
        });
    }

    test('Full Cross-Role Data Synchronization Flow', async ({ browser }) => {
        const uniqueTitle = `Audit Sync - ${Date.now()}`;
        const context = await browser.newContext();
        
        // 1. Customer Posts a Job
        const customerPage = await context.newPage();
        const clientHelper = new TestHelper(customerPage);
        await clientHelper.auth.loginAsClient();
        console.log('[Sync] Posting job as Customer...');
        
        await clientHelper.form.completeWizard(
            TEST_JOB_DATA.category,
            TEST_JOB_DATA.subType,
            TEST_JOB_DATA.branchAnswers,
            TEST_JOB_DATA.urgency
        );
        
        await customerPage.getByTestId('job-title-input').first().fill(uniqueTitle);
        await customerPage.getByTestId('job-description-input').first().fill('Data synchronization audit job.');
        await clientHelper.form.fillPincodeAndSelectPO('560001');
        await customerPage.fill('[data-testid="min-budget-input"]', '1000');
        await customerPage.fill('[data-testid="max-budget-input"]', '2000');
        await clientHelper.form.submitPostJob();
        
        await customerPage.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: TIMEOUTS.medium });
        const jobId = await clientHelper.job.getJobIdFromUrl();
        console.log(`[Sync] Job Created: ${jobId}`);

        // 2. Professional Finds and Bids on the Job
        const proPage = await context.newPage();
        const proHelper = new TestHelper(proPage);
        await proHelper.auth.loginAsProfessional();
        
        console.log('[Sync] Professional viewing job...');
        await proPage.goto(`/dashboard/jobs/${jobId}`);
        await expect(proPage.locator(`text=${uniqueTitle}`)).toBeVisible();
        
        const bidBtn = proPage.getByTestId('place-bid-button');
        await bidBtn.click();
        await proPage.locator('input[name="amount"]').fill('1500');
        await proPage.fill('textarea[name="coverLetter"]', 'Audit Sync Cover Letter');
        await proPage.getByRole('button', { name: "Place Bid" }).click();
        await proHelper.form.waitForToast('Bid Placed!');
        console.log('[Sync] Bid placed by Professional.');

        // 3. Admin Audits the Transaction
        const adminPage = await context.newPage();
        const adminHelper = new TestHelper(adminPage);
        await adminHelper.auth.loginAsAdmin();
        
        console.log('[Sync] Admin auditing audit logs...');
        await adminPage.goto('/dashboard/audit-logs');
        // Wait for the audit log entry for the new job
        await expect(adminPage.locator(`text=${jobId}`)).toBeVisible({ timeout: 20000 });
        console.log('[Sync] Data verified in Admin Audit Logs.');

        await context.close();
    });
});
