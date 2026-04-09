import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('Support Tickets', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('User can interact with AI Support Chatbot', async ({ page }) => {
        await helper.auth.loginAsClient();

        // Navigate to dashboard where support dialog is available
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');

        // Locate and click the support button
        const supportBtn = page.locator('button:has(svg.lucide-headphones)').first();
        await expect(supportBtn).toBeVisible();
        await supportBtn.click();

        // Verify dialog opens
        await expect(page.locator('text=Contact Support').first()).toBeVisible();

        // Chatbot interaction
        const chatInput = page.getByPlaceholder('Type your question...');
        await expect(chatInput).toBeVisible();
        await chatInput.fill('How do I create a job?');
        await chatInput.press('Enter');

        // Verify CI bypass response
        await expect(page.getByText('I am a CI/Test bot response to: How do I create a job?')).toBeVisible();
    });

});

