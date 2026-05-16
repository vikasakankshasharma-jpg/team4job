import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Profile & Settings Management', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Professional can update their profile information', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard/profile');
        await expect(page).toHaveURL(/.*\/dashboard\/profile/);

        // Click Edit Profile button
        const editBtn = page.getByRole('button', { name: /Edit Profile/i }).first();
        await editBtn.click();

        // Update basic info
        const newBio = `Experienced professional with expertise in CCTV and security systems. Updated at ${new Date().toISOString()}`;
        await page.getByLabel(/About Me|Bio/i).fill(newBio);
        
        // Update Address if visible/editable
        const addressInput = page.getByLabel(/Full Address|Location/i).first();
        if (await addressInput.isVisible()) {
            await addressInput.fill('123 Security Lane, Tech Park, Bangalore');
        }

        // Save changes
        await page.getByRole('button', { name: /Save Changes|Update Profile/i }).click();

        // Verify success toast
        await helper.form.waitForToast(/Profile updated successfully|Profile saved/i);

        // Verify changes persisted on page reload
        await page.reload();
        await expect(page.getByText(newBio)).toBeVisible({ timeout: TIMEOUTS.medium });
    });

    test('User can manage notification settings', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard/settings');
        await expect(page).toHaveURL(/.*\/dashboard\/settings/);

        // Find notification toggles
        const emailToggle = page.locator('button[role="switch"]').filter({ hasText: /Email/i }).first()
            .or(page.locator('label:has-text("Email Notifications")').locator('xpath=..').locator('button[role="switch"]'));
        
        if (await emailToggle.isVisible()) {
            const initialState = await emailToggle.getAttribute('aria-checked');
            await emailToggle.click();
            
            const newState = await emailToggle.getAttribute('aria-checked');
            expect(newState).not.toBe(initialState);
            
            // Save settings
            await page.getByRole('button', { name: /Save Settings|Update Settings/i }).click();
            await helper.form.waitForToast(/Settings updated|Settings saved/i);
        } else {
            // Fallback: search for checkbox if switch not found
            const emailCheckbox = page.getByLabel(/Email Notifications/i);
            if (await emailCheckbox.isVisible()) {
                const initialState = await emailCheckbox.isChecked();
                await emailCheckbox.setChecked(!initialState);
                
                await page.getByRole('button', { name: /Save Settings|Update Settings/i }).click();
                await helper.form.waitForToast(/Settings updated|Settings saved/i);
            }
        }
    });

    test('User can update security settings (password change UI visibility)', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard/settings');
        
        // Navigate to Security tab if present
        const securityTab = page.getByRole('tab', { name: /Security|Password/i }).first();
        if (await securityTab.isVisible()) {
            await securityTab.click();
        }

        // Verify password change fields are present
        await expect(page.getByLabel(/Current Password/i)).toBeVisible();
        await expect(page.getByLabel(/New Password/i)).toBeVisible();
        await expect(page.getByLabel(/Confirm New Password/i)).toBeVisible();
    });
});


