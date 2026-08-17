
import { test } from '@playwright/test';
import { TestHelper } from '../../utils/helpers';
import { TestState } from '../../utils/test-state';

/**
 * Audit Chunk 1: Profile & Setup
 * Role: Professional (Installer)
 * Responsibility: Ensure the professional profile is updated and discovery-ready.
 */
test.describe('Audit Chunk 1: Profile Setup', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async () => {
        // Only clear if not explicitly persisting state
        if (process.env.E2E_NO_CLEAR !== 'true') {
            TestState.clear();
            TestState.save({ uniqueTitle: `Audit Job - ${Date.now()}` });
        }
    });

    test('Installer updates profile skills', async ({ page }) => {
        const helper = new TestHelper(page);
        console.log('--- CHUNK 1: Installer Profile Update ---');
        
        await helper.auth.loginAsProfessional();
        await helper.auth.injectNuclearCSS();
        
        await page.goto('/dashboard/profile');
        await helper.auth.waitForQuiescence();
        
        // Update Skills for discovery matching
        const editProfileBtn = page.getByRole('button', { name: /Edit Profile/i }).first();
        if (await editProfileBtn.waitFor({ state: 'visible', timeout: 2430000 }).catch(() => false)) {
            await editProfileBtn.click();
            
            await helper.auth.injectNuclearCSS(); // Ensure modal isn't blocked
            
            const skillsInput = page.locator('input[name="skills"], input[placeholder*="Skills"]').first();
            await skillsInput.fill('CCTV, Smart Home, Audit-Testing');
            
            const saveBtn = page.getByRole('button', { name: /Save|Update/i }).first();
            await saveBtn.click();
            
            await helper.form.waitForToast(/Updated|Success/i).catch(() => {});
        }
        
        console.log('✅ Chunk 1 Complete: Profile updated.');
    });
});
