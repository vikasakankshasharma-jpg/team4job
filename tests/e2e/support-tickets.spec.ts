import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

test.describe('Support Tickets', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
    });

    test('User can interact with AI Support Chatbot', async ({ page }) => {
        // Skip test on mobile because support dialog is not available in mobile menu yet
        const viewport = page.viewportSize();
        test.skip(!!viewport && viewport.width < 768, 'Support Dialog is only in desktop sidebar for now');

        await helper.auth.loginAsClient();

        // Navigate to dashboard where support dialog is available
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');

        // Locate and click the support button
        const supportBtn = page.getByTestId('support-trigger-button');
        await expect(supportBtn).toBeVisible({ timeout: 1620000 });
        await page.waitForTimeout(15000); // Wait for React hydration before native click
        await supportBtn.evaluate(b => (b as HTMLElement).click());

        // Verify dialog opens
        await expect(page.locator('text=Contact Support').first()).toBeVisible({ timeout: 1620000 });

        // Chatbot interaction
        const chatInput = page.getByPlaceholder('Type your question...');
        await expect(chatInput).toBeVisible();
        await chatInput.fill('How do I create a job?');
        await chatInput.press('Enter');

        // Verify CI bypass response
        await expect(page.getByText('I am a CI/Test bot response to: How do I create a job?')).toBeVisible();
    });

});

