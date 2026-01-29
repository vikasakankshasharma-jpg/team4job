import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Testing Suite
 * Tests WCAG 2.1 AA compliance across critical pages
 */

test.describe('Accessibility Tests', () => {
    test('Landing page should not have accessibility violations', async ({ page }) => {
        await page.goto('/');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Login page should not have accessibility violations', async ({ page }) => {
        await page.goto('/login');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Signup page should not have accessibility violations', async ({ page }) => {
        await page.goto('/signup');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Dashboard should not have accessibility violations', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[name="identifier"]', 'installer@example.com');
        await page.fill('input[type="password"]', 'Test@1234');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard.*/, { timeout: 60000 });

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Keyboard navigation should work on landing page', async ({ page }) => {
        await page.goto('/');

        // Tab through interactive elements
        await page.keyboard.press('Tab');
        const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(['A', 'BUTTON', 'INPUT']).toContain(firstFocusedElement);

        // Ensure focus is visible
        const hasFocusStyles = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el) return false;
            const styles = window.getComputedStyle(el);
            return styles.outline !== 'none' || styles.boxShadow !== 'none';
        });
        expect(hasFocusStyles).toBeTruthy();
    });

    test('Images should have alt text', async ({ page }) => {
        await page.goto('/');

        const imagesWithoutAlt = await page.locator('img:not([alt])').count();
        expect(imagesWithoutAlt).toBe(0);
    });

    test('Form inputs should have labels', async ({ page }) => {
        await page.goto('/login');

        const inputs = await page.locator('input[name="identifier"], input[type="password"]').all();

        for (const input of inputs) {
            const hasLabel = await input.evaluate((el) => {
                const id = el.getAttribute('id');
                const ariaLabel = el.getAttribute('aria-label');
                const ariaLabelledBy = el.getAttribute('aria-labelledby');
                const hasLabelTag = id ? document.querySelector(`label[for="${id}"]`) : null;

                return !!(ariaLabel || ariaLabelledBy || hasLabelTag);
            });

            expect(hasLabel).toBeTruthy();
        }
    });

    test('Color contrast should be sufficient', async ({ page }) => {
        await page.goto('/');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2aa'])
            .include('body')
            .analyze();

        const contrastViolations = accessibilityScanResults.violations.filter(
            v => v.id === 'color-contrast'
        );

        expect(contrastViolations).toEqual([]);
    });
});
