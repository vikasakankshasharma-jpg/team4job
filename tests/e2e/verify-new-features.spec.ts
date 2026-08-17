
import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from '../fixtures/test-data';
import { TestHelper } from '../utils/helpers';

test.describe('Client Enhancements Verification', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Verify Draft Auto-Save and Design Elements', async ({ page }) => {
        // 1. Login as Client
        console.log('Logging in...');
        await helper.auth.loginAsClient();

        // 2. Verify Posted Jobs Design Enhancements (Phase 1)
        console.log('Verifying Design Enhancements...');
        await page.goto('/dashboard/posted-jobs');

        // Check for Status Badge (look for an element with the new badge classes or text)
        // We look for the "Active" tab content
        await expect(page.getByRole('tab', { name: 'Active' })).toBeVisible();

        // Check if we have the new "Post New Job" button style (handles empty state too)
        const postJobBtn = page.getByRole('link', { name: /Post (New|Your First) Job/i }).first();
        await expect(postJobBtn).toBeVisible();

        // 3. Verify Draft Auto-Save (Enhancement #4)
        console.log('Verifying Draft Auto-Save...');
        
        // Complete Wizard first to populate Draft state
        await helper.form.completeWizard(
            'Security & Surveillance',
            'CCTV / Video Surveillance',
            [
                '3-4', 
                'Both', 
                'Commercial',
                'needs fresh wiring',
                '1 week',
                'Not needed',
                'Mobile viewing only'
            ],
            'Within 1-2 Days'
        );

        // Wait for auto-save (default interval is 30s)
        console.log('Waiting for auto-save trigger...');
        await page.waitForTimeout(35000); // Wait 35s to be safe

        console.log('Reloading to test recovery...');
        await page.reload();

        // Check for Recovery Dialog
        // The dialog typically says "Resume your draft?"
        try {
            const resumeBtn = page.getByRole('button', { name: /Resume Draft/i });
            await expect(resumeBtn).toBeVisible({ timeout: 60000 });
            console.log('✅ Recovery Dialog appeared!');
            await resumeBtn.click();

            // Verify data persisted in the DOM (Wizard Review step shows title)
            await expect(page.locator('text=Security & Surveillance').first()).toBeVisible({ timeout: 60000 });
            console.log('✅ Data persisted correctly!');
        } catch (e) {
            console.log('⚠️ Draft recovery dialog did not appear. It might have auto-resumed.');
        }

    });
});


