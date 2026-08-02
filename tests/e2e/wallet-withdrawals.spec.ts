import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Wallet Withdrawals', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Professional can view wallet balance and withdrawal history', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard/wallet');
        await expect(page).toHaveURL(/.*\/dashboard\/wallet/);

        // Verify balance elements
        await expect(page.getByText(/Available Balance|Wallet Balance/i).first()).toBeVisible();
        
        // Verify transaction history table or list
        const transactionList = page.locator('[data-testid="transaction-list"], table');
        await expect(transactionList).toBeVisible({ timeout: TIMEOUTS.medium });
    });

    test('Professional can initiate a withdrawal request', async ({ page }) => {
        await helper.auth.loginAsProfessional();

        await page.goto('/dashboard/wallet');

        // Click Withdraw button - wait for wallet page to fully render
        const withdrawBtn = page.getByRole('button', { name: /Withdraw/i }).first();
        await withdrawBtn.waitFor({ state: 'visible', timeout: TIMEOUTS.long });
        await withdrawBtn.click();

        // Fill withdrawal form
        await page.getByLabel(/Amount/i).fill('100');
        
        // Select bank account if multiple
        const accountSelect = page.getByRole('combobox', { name: /Account|Bank/i }).first();
        if (await accountSelect.isVisible()) {
            await accountSelect.click();
            await page.getByRole('option').first().click();
        }

        // Submit request
        await page.getByRole('button', { name: /Request Withdrawal|Submit/i }).click();

        // Verify success toast
        await helper.form.waitForToast(/Withdrawal request submitted|Request successful/i);

        // Verify it appears in the history as Pending
        await expect(page.getByText(/Pending/i).first()).toBeVisible({ timeout: TIMEOUTS.medium });
        await expect(page.getByText('100')).toBeVisible();
    });
});


