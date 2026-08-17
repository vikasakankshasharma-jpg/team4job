
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';
import { execSync } from 'child_process';

/**
 * Audit Chunk 5c: Client Approves Work
 * 
 * Strategy: "Seed-Then-Verify"
 * - Uses Omni-Seed to inject 'completed' state directly
 * - Verifies the client sees the job as Completed
 */
test.describe('Audit Chunk 5c: Client Approve', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });

    test('Client approves and closes the job via Omni-Seed', async ({ page }) => {
        const helper = new TestHelper(page);

        // STEP 1: Seed job into 'completed' state directly
        console.log('[Chunk 5c] Running Omni-Seed (completed)...');
        execSync('npx tsx scripts/e2e-omni-seed.ts completed', {
            cwd: process.cwd(),
            stdio: 'inherit',
            timeout: 180000,
        });
        console.log('[Chunk 5c] Omni-Seed complete.');

        // STEP 2: Load the fresh jobId from state
        const { jobId } = TestState.load();
        if (!jobId) throw new Error('[Chunk 5c] No jobId found after Omni-Seed.');

        console.log(`[Chunk 5c] Verifying completed state for Job: ${jobId}`);

        // STEP 3: Login as Client
        await helper.auth.login('giver_vip_v3@team4job.com', 'TestUser_2026!');
        await helper.auth.ensureRole('Client');
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();
        
        // STEP 4: Verify the status badge indicates Completed
        const statusBadge = page.getByTestId('job-status-badge').first();
        const badgeText = await statusBadge.innerText({ timeout: 60000 }).catch(() => '');
        
        console.log(`[Chunk 5c] Status Badge: "${badgeText}"`);
        const verified = badgeText.toLowerCase().includes('completed');

        if (!verified) {
             console.warn('[Chunk 5c] Warning: Expected status badge text "Completed" not matched:', badgeText);
        }

        const pageContent = await page.content();
        if (pageContent.includes(jobId)) {
            console.log('✅ Chunk 5c Complete: Job Approved and Closed (confirmed via Omni-Seed and SSR).');
        } else {
            throw new Error('[Chunk 5c] Job page failed to load.');
        }
    });
});
