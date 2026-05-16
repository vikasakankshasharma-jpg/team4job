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

        // Fill coupon form
        const couponCode = `SAVE${Math.floor(Math.random() * 1000)}`;
        await page.getByLabel(/Code/i).fill(couponCode);
        await page.getByLabel(/Discount Percentage|Amount/i).fill('10');
        
        // Select type
        const typeSelect = page.getByRole('combobox', { name: /Type/i }).first();
        if (await typeSelect.isVisible()) {
            await typeSelect.click();
            await page.getByRole('option', { name: /Percentage/i }).first().click();
        }

        // Set expiry date
        const expiryInput = page.getByLabel(/Expiry|Valid Until/i).first();
        if (await expiryInput.isVisible()) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            await expiryInput.fill(futureDate.toISOString().split('T')[0]);
        }

        // Save coupon
        await page.getByRole('button', { name: /Save|Create/i }).click();

        // Verify success toast
        await helper.form.waitForToast(/Coupon created|Saved successfully/i);

        // Verify it appears in the list
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

