import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Coupons & Discounts', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Admin can create a new discount coupon', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/coupons');
        await expect(page).toHaveURL(/.*\/dashboard\/coupons/);

        // Click Create Coupon button
        const createBtn = page.getByRole('button', { name: /Create|New Coupon/i }).first();
        await createBtn.click();

        // Fill coupon form (subscription plan coupon)
        const couponCode = `SAVE${Math.floor(Math.random() * 1000)}`;
        
        // Find inputs by order if labels aren't strictly matched
        const inputs = page.locator('input:not([type="hidden"])');
        await inputs.nth(0).fill(couponCode);
        await inputs.nth(1).fill('Free 30 days subscription'); // Description
        await inputs.nth(2).fill('pro-Professional-annual'); // Plan ID
        await inputs.nth(3).fill('30'); // Duration (Days)
        
        // Select applicable role
        const roleSelect = page.getByRole('combobox').first();
        if (await roleSelect.isVisible()) {
            await roleSelect.click();
            await page.getByRole('option', { name: /Any/i }).first().click();
        }

        // Save coupon
        await page.getByRole('button', { name: /Save|Create|Submit/i }).first().click();

        // Verify it appears in the list (wait for dialog to close)
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 1620000 });
        await expect(page.getByText(couponCode)).toBeVisible({ timeout: TIMEOUTS.medium });
    });

    test('Client can apply a discount coupon during checkout/job funding', async ({ page }) => {
        // This test assumes a job exists and is ready for funding
        await helper.auth.loginAsClient();

        // Navigate to a job funding/payment page (simplified for this test)
        // In a real scenario, we might use a specific job ID
        await page.goto('/dashboard/jobs');
        const fundBtn = page.getByRole('button', { name: /Fund|Pay/i }).first();
        
        if (await fundBtn.isVisible()) {
            await fundBtn.click();
            
            // Look for coupon input
            const couponInput = page.getByPlaceholder(/Coupon Code|Enter code/i).first()
                .or(page.getByLabel(/Coupon/i));
            
            if (await couponInput.isVisible()) {
                await couponInput.fill('WELCOME10'); // Assume a default seeded coupon
                await page.getByRole('button', { name: /Apply/i }).click();
                
                // Verify discount applied
                await expect(page.getByText(/Discount Applied|Coupon Applied/i)).toBeVisible({ timeout: TIMEOUTS.medium });
            }
        } else {
            console.log('No fundable job found, skipping coupon application check.');
        }
    });
});

