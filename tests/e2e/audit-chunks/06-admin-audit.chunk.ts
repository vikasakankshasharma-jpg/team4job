
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';
import { TIMEOUTS } from '../../fixtures/test-data';
import { execSync } from 'child_process';

/**
 * Audit Chunk 6: Admin Dashboard Audit
 * 
 * Strategy: "Seed-Then-Verify"
 * - Uses Omni-Seed to inject 'completed' state
 * - Verifies the job status in the Admin Console
 */
test.describe('Audit Chunk 6: Admin Audit', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });

    test('Admin verifies job completion status via Omni-Seed', async ({ page }) => {
        const helper = new TestHelper(page);

        // STEP 1: Seed job into 'completed' state directly
        console.log('[Chunk 6] Running Omni-Seed (completed)...');
        execSync('npx tsx scripts/e2e-omni-seed.ts completed', {
            cwd: process.cwd(),
            stdio: 'inherit',
            timeout: 4860000,
        });
        console.log('[Chunk 6] Omni-Seed complete.');

        // STEP 2: Load jobId
        const { jobId } = TestState.load();
        if (!jobId) throw new Error('[Chunk 6] No jobId found in state.');
        console.log(`--- CHUNK 6: Admin Audit for ${jobId} ---`);

        // STEP 3: Admin Login
        await helper.auth.loginAsAdmin();

        // STEP 4: Navigate to Admin Jobs table (Global view)
        await page.goto('/dashboard/all-jobs', { waitUntil: 'domcontentloaded' });
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();
        
        // STEP 5: Verify the job row and status
        const adminJobRow = page.locator('tr, [role="row"]').filter({ hasText: jobId }).first();
        await expect(adminJobRow).toBeVisible({ timeout: TIMEOUTS.medium });
        
        // Final status check
        await expect(adminJobRow.locator('text=/Completed|Done/i')).toBeVisible({ timeout: 1620000 });
        
        console.log('✅ Chunk 6 Complete: Admin verification successful.');
    });
});
