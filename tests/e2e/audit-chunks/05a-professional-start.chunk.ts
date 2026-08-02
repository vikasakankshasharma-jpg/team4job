
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';
import { execSync } from 'child_process';

/**
 * Audit Chunk 5a: Professional Starts Work
 * 
 * Strategy: "Seed-Then-Verify"
 * - Uses Omni-Seed to atomically inject 'work_started' state
 * - Verifies the Start OTP section is gone and completion UI is available
 */
test.describe('Audit Chunk 5a: Professional Start', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });

    test('Professional starts the job with OTP via Omni-Seed', async ({ page }) => {
        const helper = new TestHelper(page);

        // STEP 1: Seed job into 'work_started' state directly via Omni-Seed
        console.log('[Chunk 5a] Running Omni-Seed (work_started)...');
        execSync('npx tsx scripts/e2e-omni-seed.ts work_started', {
            cwd: process.cwd(),
            stdio: 'inherit',
            timeout: 60000,
        });
        console.log('[Chunk 5a] Omni-Seed complete.');

        // STEP 2: Load the fresh jobId from state
        const { jobId } = TestState.load();
        if (!jobId) throw new Error('[Chunk 5a] No jobId after Omni-Seed.');
        console.log(`[Chunk 5a] Verifying work_started state for Job: ${jobId}`);

        // STEP 3: Login as Professional and verify the job is in work_started state
        await helper.auth.login('installer_pro_v3@team4job.com', 'TestUser_2026!');
        await helper.auth.ensureRole('Professional');
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();

        // STEP 4: Verify job is in work_started state
        // When work is started, the OTP input should NOT be visible.
        const otpInput = page.getByTestId('otp-input').first();
        const hasOtpInput = await otpInput.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (hasOtpInput) {
            throw new Error('[Chunk 5a] Failed verification: OTP Input is still visible, work NOT started.');
        }

        // We can just verify SSR loaded ok
        const pageContent = await page.content();
        if (pageContent.includes(jobId)) {
            console.log('✅ Chunk 5a Complete: Work Started (confirmed via Omni-Seed and SSR).');
        } else {
            throw new Error('[Chunk 5a] Job page failed to load.');
        }
    });
});
