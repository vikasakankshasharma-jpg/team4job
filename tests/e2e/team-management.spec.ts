import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Team Management', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('Admin can invite a new team member', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');
        await expect(page).toHaveURL(/.*\/dashboard\/team/);

        // Click Invite Member button
        const inviteBtn = page.getByRole('button', { name: /Invite|Add Member/i }).first();
        await inviteBtn.click();

        // Fill invitation form
        const email = `new-member-${Date.now()}@example.com`;
        await page.getByLabel(/Email/i).fill(email);
        
        // Select role
        const roleSelect = page.getByRole('combobox', { name: /Role/i }).first()
            .or(page.locator('[data-testid="role-select-trigger"]'));
        
        if (await roleSelect.isVisible()) {
            await roleSelect.click();
            await page.getByRole('option', { name: /Support|Staff|Member/i }).first().click();
        }

        // Send invitation
        await page.getByRole('button', { name: /Send Invite|Add/i }).click();

        // Verify success toast
        await helper.form.waitForToast(/Invitation sent|Member added/i);

        // Verify member appears in the list (pending or active)
        await expect(page.getByText(email)).toBeVisible({ timeout: TIMEOUTS.medium });
    });

    test('Admin can change a team member role', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');

        // Find a member in the list
        const memberRow = page.locator('tr').filter({ hasText: /@/i }).first();
        await expect(memberRow).toBeVisible({ timeout: TIMEOUTS.medium });

        // Click actions/role menu for the member
        const roleBtn = memberRow.getByRole('combobox').first()
            .or(memberRow.locator('button:has-text("Role"), button[aria-label*="Change Role"]'));
        
        if (await roleBtn.isVisible()) {
            await roleBtn.click();
            await page.getByRole('option', { name: /Admin|Support/i }).first().click();
            
            // Verify success toast
            await helper.form.waitForToast(/Role updated/i);
        }
    });

    test('Admin can remove a team member', async ({ page }) => {
        await helper.auth.loginAsAdmin();

        await page.goto('/dashboard/team');

        // Find a member row
        const memberRow = page.locator('tr').filter({ hasText: /@/i }).first();
        const memberEmail = await memberRow.locator('td').first().innerText();

        // Click remove/delete button
        const removeBtn = memberRow.getByRole('button', { name: /Remove|Delete/i }).first()
            .or(memberRow.locator('button[aria-label*="Remove"]'));
        
        await removeBtn.click();

        // Handle confirmation dialog
        const confirmBtn = page.getByRole('button', { name: /Confirm|Delete|Yes/i }).first();
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
            await confirmBtn.click();
        }

        // Verify success toast
        await helper.form.waitForToast(/Member removed|Deleted successfully/i);

        // Verify member no longer in the list
        await expect(page.getByText(memberEmail)).not.toBeVisible({ timeout: TIMEOUTS.medium });
    });
});

