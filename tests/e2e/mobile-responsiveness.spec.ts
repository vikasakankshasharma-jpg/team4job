
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
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
        console.log('[Mobile] Login page loaded');

        // 2. Login as Job Giver
        await helper.auth.loginAsJobGiver();
        // Wait for dashboard
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

        // 5. Verify Post Job Form is usable (not cutting off)
        await expect(page.getByLabel('Job Title')).toBeVisible();
        console.log('[Mobile] Post Job form verified');
    });

    // We can add a simple check for Job Detail buttons stacking if needed, 
    // but the above covers the critical "Can I navigate?" requirement.
});
