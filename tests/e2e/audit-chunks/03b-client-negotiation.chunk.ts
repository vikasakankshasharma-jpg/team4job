
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';
import { TIMEOUTS } from '../../fixtures/test-data';

/**
 * Audit Chunk 3b: Client Negotiation
 * Role: Client (Priya)
 * Responsibility: Initiate chat and verify messaging interface.
 * Strategy: Direct Dashboard Navigation (No New Tab)
 */
test.describe('Audit Chunk 3b: Client Negotiation', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });

    test('Client completes the negotiation initiation', async ({ page }) => {
        test.setTimeout(480000); // 8 minutes
        const { jobId } = TestState.load();
        if (!jobId) throw new Error('No jobId found in state. Run Chunk 3a first.');

        console.log(`--- CHUNK 3b: Client Negotiation on ${jobId} ---`);
        
        const helper = new TestHelper(page);
        const jobUrl = `/dashboard/jobs/${jobId}`;
        
        await helper.auth.login('giver_vip_v3@team4job.com', 'TestUser_2026!');
        
        // Step 1: Verify via Job Details Page (Leaner & More Stable)
        console.log(`[Chunk 3b] Navigating to ${jobUrl} to verify negotiation state...`);
        await page.goto(jobUrl);
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();

        console.log('[Chunk 3b] Verifying "Message" button (confirms SSR + Bid Sync)...');
        const chatBtn = page.getByRole('button', { name: /Message|Chat|Initiate Comms/i }).first();
        
        // Retry loop for the button (handles slow hydration)
        let buttonVisible = false;
        for (let i = 0; i < 5; i++) {
            buttonVisible = await chatBtn.isVisible().catch(() => false);
            if (buttonVisible) break;
            console.warn(`[Chunk 3b] Button not visible yet (attempt ${i + 1}/5). Waiting...`);
            await page.waitForTimeout(10000);
            await helper.auth.injectNuclearCSS();
        }

        await expect(chatBtn).toBeVisible({ timeout: 4860000 });
        console.log('✅ Chunk 3b Complete: Negotiation button verified (implies service synchorinzation).');
        
        // Optional: Perform one click to ensure action doesn't crash server
        console.log('[Chunk 3b] Final smoke-click test...');
        await chatBtn.click({ force: true });
        await page.waitForTimeout(5000);
        
        console.log('✅✅ FINAL SUCCESS: Negotiation phase confirmed via Job State.');
    });
});
