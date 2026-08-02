import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit @a11y', () => {
    test('Landing Page should have no detectable accessibility violations', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('h1');
        
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .disableRules(['color-contrast', 'button-name', 'scrollable-region-focusable', 'heading-order']).analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log('ACCESS_VIOLATIONS_LANDING:', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Login Page should have no detectable accessibility violations', async ({ page }) => {
        await page.goto('/login');
        await page.waitForSelector('form');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .disableRules(['color-contrast', 'button-name', 'scrollable-region-focusable', 'heading-order']).analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log('ACCESS_VIOLATIONS_LOGIN:', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });
});
