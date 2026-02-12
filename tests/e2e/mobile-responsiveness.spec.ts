
import { test, expect } from '@playwright/test';
import { AuthHelper, JobHelper } from '../utils/helpers';

// Use iPhone 12/13 Pro dimensions
test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
});

test.describe('Mobile Responsiveness', () => {
    let helper: { auth: AuthHelper; job: JobHelper };

    test.beforeEach(async ({ page }) => {
        helper = {
            auth: new AuthHelper(page),
            job: new JobHelper(page)
        };
    });

    test('Mobile Navigation & Dashboard Layout', async ({ page }) => {
        // 1. Landing Page / Login
        console.log('[Mobile] Navigating to login...');
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
        console.log('[Mobile] Login page loaded');

        // 2. Login as Job Giver
        console.log('[Mobile] Attempting login...');
        await helper.auth.loginAsJobGiver();

        // Wait for dashboard with increased timeout and debug logs
        console.log('[Mobile] Waiting for dashboard navigation...');
        try {
            await page.waitForURL(/\/dashboard/, { timeout: 30000 });
            console.log('[Mobile] Dashboard URL detected');
        } catch (e) {
            console.log('[Mobile] Dashboard URL timeout. Current URL:', page.url());
            // Take snapshot if failed
            console.log('[Mobile] Page content snapshot:', await page.content());
            throw e;
        }

        await expect(page.getByText('Active Jobs').first()).toBeVisible({ timeout: 20000 });
        console.log('[Mobile] Dashboard loaded');

        // 3. Verify Desktop Sidebar is HIDDEN
        // The sidebar component has `hidden sm:flex`.
        // We can't easily select it if it's hidden, but we can check the mobile trigger is VISIBLE.
        const mobileMenuTrigger = page.getByRole('button', { name: 'Toggle Menu' });
        await expect(mobileMenuTrigger).toBeVisible();
        console.log('[Mobile] Hamburger menu trigger is visible');

        // 4. Open Mobile Menu
        await mobileMenuTrigger.click();

        // Verify Menu Content (Sheet)
        const sheet = page.locator('div[role="dialog"]');
        await expect(sheet).toBeVisible();
        await expect(sheet.getByRole('link', { name: 'Dashboard' })).toBeVisible();
        await expect(sheet.getByRole('link', { name: 'Post a Job' })).toBeVisible();
        console.log('[Mobile] Mobile menu opened and links are visible');

        // Close menu (click link or outside - clicking link navigates)
        // Let's click "Post a Job" to verify navigation
        await sheet.getByRole('link', { name: 'Post a Job' }).click();
        await expect(page).toHaveURL(/.*\/post-job/);
        console.log('[Mobile] Navigated to Post Job via mobile menu');

        // 5. Handle "Resume your draft?" dialog if present
        // Wait for potential draft check network request
        await page.waitForLoadState('networkidle').catch(() => { });

        const resumeDialog = page.getByRole('dialog', { name: 'Resume your draft?' });
        if (await resumeDialog.isVisible({ timeout: 15000 })) {
            console.log('[Mobile] Draft dialog detected. Discarding draft...');
            try {
                await page.getByRole('button', { name: 'Discard' }).click({ force: true });
                await expect(resumeDialog).not.toBeVisible({ timeout: 15000 });
                console.log('[Mobile] Draft dialog dismissed successfully.');
            } catch (e) {
                console.error('[Mobile] Failed to dismiss draft dialog:', e);
                // Fail the test if we couldn't dismiss the blocking dialog
                throw e;
            }
        } else {
            console.log('[Mobile] No draft dialog detected within timeout.');
        }

        // 6. Verify Post Job Form is usable (not cutting off)
        await expect(page.getByRole('heading', { name: 'Post Job' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByPlaceholder('e.g., CCTV Installation')).toBeVisible();
        console.log('[Mobile] Post Job form verified');
    });
});
