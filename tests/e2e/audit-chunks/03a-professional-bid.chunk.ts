
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';

/**
 * Audit Chunk 3a: Professional Bidding
 * Role: Professional (Installer)
 * Responsibility: Find job and submit a bid.
 */
test.describe('Audit Chunk 3a: Professional Bidding', () => {
    test.beforeEach(async () => {
        process.env.E2E_NO_CLEAR = 'true';
    });

    test('Professional finds job and bids', async ({ page }) => {
        test.setTimeout(480000); // 8 minutes
        const { jobId } = TestState.load();
        if (!jobId) throw new Error('No jobId found in state. Run Chunk 2 first.');

        console.log(`--- CHUNK 3a: Professional Bidding on ${jobId} ---`);
        
        const helper = new TestHelper(page);
        await helper.auth.login('installer_pro_v3@team4job.com', 'TestUser_2026!');
        await helper.auth.ensureRole('Professional');
        
        await page.goto(`/dashboard/jobs/${jobId}`);
        await helper.auth.injectNuclearCSS();
        await helper.auth.waitForQuiescence();
        
        const placeBidBtn = page.getByTestId('place-bid-button');
        const viewBidBtn = page.getByRole('button', { name: /View My Bid|Modify Bid|Proposal Submitted/i });

        if (await viewBidBtn.isVisible({ timeout: 60000 }).catch(() => false)) {
            console.log('[Chunk 3a] Bid already placed. Skipping.');
        } else if (await placeBidBtn.isVisible({ timeout: 60000 }).catch(() => false) && (await placeBidBtn.innerText()).includes('Submitted')) {
            console.log('[Chunk 3a] Bid button shows "Submitted". Skipping.');
        } else if (await placeBidBtn.isVisible({ timeout: 60000 }).catch(() => false) && await placeBidBtn.isDisabled()) {
            console.log('[Chunk 3a] Bid button disabled. Checking for bid card...');
            const bidCard = page.getByTestId('bid-card-wrapper').first();
            if (await bidCard.isVisible({ timeout: 60000 }).catch(() => false)) {
                console.log('[Chunk 3a] Bid card detected. Skipping.');
            } else {
                console.log('[Chunk 3a] Refreshing for disabled button state...');
                await page.reload();
                await helper.auth.injectNuclearCSS();
                await helper.auth.waitForQuiescence();
                if (await viewBidBtn.isVisible({ timeout: 60000 }).catch(() => false)) {
                     console.log('[Chunk 3a] Bid visible after refresh.');
                } else {
                    throw new Error('Bid button disabled but no bid card found.');
                }
            }
        } else {
            await expect(placeBidBtn).toBeVisible({ timeout: 60000 });
            await placeBidBtn.click();
            
            const bidDialog = page.getByRole('dialog');
            await expect(bidDialog).toBeVisible({ timeout: 60000 });
            
            await bidDialog.locator('input[name="amount"]').fill('6000');
            await bidDialog.locator('textarea[name="coverLetter"]').fill('I have the specific skills for this audit chunk.');
            
            await page.getByTestId('submit-bid-button').click({ force: true });
            
            try {
                await helper.form.waitForToast(/Bid placed successfully|Bid Placed!/i, 15000);
            } catch (e) {
                console.log('[Chunk 3a] Toast timeout, checking button state...');
                await expect(viewBidBtn).toBeVisible({ timeout: 90000 });
            }
            console.log('✅ Chunk 3a Complete: Bid placed.');
        }
    });
});
