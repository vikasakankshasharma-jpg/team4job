
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';
import { execSync } from 'child_process';

/**
 * Audit Chunk 7b: Professional Rates Client
 * 
 * Strategy: "Seed-Then-Verify"
 * - Uses Omni-Seed to inject 'fully_rated' state directly
 * - Verifies the UI reflects the mutual reveal of reviews
 */
test.describe('Audit Chunk 7b: Professional Rate', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });

    test('Professional rating reveal is successfully reflected in UI', async ({ page }) => {
        const helper = new TestHelper(page);

        // STEP 1: Seed job into 'fully_rated' state directly
        console.log('[Chunk 7b] Running Omni-Seed (fully_rated)...');
        execSync('npx tsx scripts/e2e-omni-seed.ts fully_rated', {
            cwd: process.cwd(),
            stdio: 'inherit',
            timeout: 60000,
        });
        console.log('[Chunk 7b] Omni-Seed complete.');

        // STEP 2: Load jobId
        const { jobId } = TestState.load();
        if (!jobId) throw new Error('[Chunk 7b] No jobId found in state.');

        console.log(`--- CHUNK 7b: Professional Rating Verification for ${jobId} ---`);
        
        // STEP 3: Professional Login
        await helper.auth.login('installer_pro_v3@team4job.com', 'TestUser_2026!');
        await helper.auth.ensureRole('Professional');
        await page.goto(`/dashboard/jobs/${jobId}`, { waitUntil: 'domcontentloaded' });
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();
        
        // STEP 4: Final Verification: Reviews should be revealed now
        const reviewsRevealed = page.getByTestId('reviews-revealed-section').first();
        await expect(reviewsRevealed).toBeVisible({ timeout: 20000 });
        
        // Check for specific review text seeded by Omni-Seed
        await expect(page.getByText('Excellent professional service. Highly recommended.')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Great client experience. Clear requirements.')).toBeVisible({ timeout: 10000 });
        
        console.log('✅ Chunk 7b Complete: Reviews Revealed (Atomic Check).');
    });
});
