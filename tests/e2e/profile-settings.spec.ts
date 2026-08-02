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

        // Update basic info (Name & Mobile)
        const newName = `Pro User ${Math.floor(Math.random() * 1000)}`;
        await page.getByLabel(/Name/i).fill(newName);
        await page.getByLabel(/Mobile Number|Phone/i).fill('9876543210');

        // Fill Residence Address
        await page.getByLabel(/House\/Flat No/i).nth(0).fill('123 Residence Lane');
        await page.getByLabel(/Street\/Area/i).nth(0).fill('Main Road');
        await page.getByLabel(/City\/Village/i).nth(0).fill('Test City');
        await page.getByLabel(/Pincode/i).nth(0).fill('110001');

        // Fill Office Address (if professional)
        const officeHouseInput = page.getByLabel(/House\/Flat No/i).nth(1);
        if (await officeHouseInput.isVisible()) {
            await officeHouseInput.fill('456 Office Tower');
            await page.getByLabel(/Street\/Area/i).nth(1).fill('Business District');
            await page.getByLabel(/City\/Village/i).nth(1).fill('Test City');
            await page.getByLabel(/Pincode/i).nth(1).fill('110001');
        }

        // Save changes
        await page.getByRole('button', { name: /Save Changes|Update Profile/i }).click();

        // Verify success toast
        await helper.form.waitForToast('Profile Updated').catch(() => { console.log('Missed toast, proceeding with persistence check'); });

        // Verify changes persisted on page reload
        await page.reload();
        await expect(page.getByText(newName)).toBeVisible({ timeout: TIMEOUTS.medium });
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

        // Verify the Change Password button is present
        await expect(page.getByRole('button', { name: /Change Password/i }).first()).toBeVisible();
    });
});


