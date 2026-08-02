
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';
import { execSync } from 'child_process';

/**
 * Audit Chunk 7a: Client Rates Professional
 * 
 * Strategy: "Seed-Then-Verify"
 * - Uses Omni-Seed to inject 'client_rated' state directly
 * - Verifies the UI reflects the locked review state
 */
test.describe('Audit Chunk 7a: Client Rate', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });

    test('Client rating is successfully reflected in UI', async ({ page }) => {
        const helper = new TestHelper(page);

        // STEP 1: Seed job into 'client_rated' state directly
        console.log('[Chunk 7a] Running Omni-Seed (client_rated)...');
        execSync('npx tsx scripts/e2e-omni-seed.ts client_rated', {
            cwd: process.cwd(),
            stdio: 'inherit',
            timeout: 60000,
        });
        console.log('[Chunk 7a] Omni-Seed complete.');

        // STEP 2: Load jobId
        const { jobId } = TestState.load();
        if (!jobId) throw new Error('[Chunk 7a] No jobId found in state.');
        console.log(`--- CHUNK 7a: Client Rating Verification for ${jobId} ---`);
        
        // STEP 3: Client Login
        await helper.auth.login('giver_vip_v3@team4job.com', 'TestUser_2026!');
        await helper.auth.ensureRole('Client');
        await page.goto(`/dashboard/jobs/${jobId}`, { waitUntil: 'domcontentloaded' });
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();
        
        // STEP 4: Verify "Trust Protocol Engaged" (Locked) card is visible
        const clientReviewLocked = page.getByTestId('review-locked-card').first();
        await expect(clientReviewLocked).toBeVisible({ timeout: 20000 });
        
        console.log('✅ Chunk 7a Complete: Professional Rated (Atomic Check).');
    });
});
