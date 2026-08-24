import { test, expect } from '@playwright/test';

test.describe('Production Smoke Tests', () => {
    // Uses actual domain as fallback for smoke testing
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://team4job.com';

    test('Homepage loads and displays core branding', async ({ page }) => {
        await page.goto(APP_URL);
        await expect(page).toHaveTitle(/Team4Job/);
    });

    test('Public Auth Pages are accessible', async ({ page }) => {
        await page.goto(APP_URL + '/auth/login');
        await expect(page.getByRole('button', { name: /Sign in|Login/i })).toBeVisible();
        
        await page.goto(APP_URL + '/auth/register');
        await expect(page.getByRole('button', { name: /Create Account|Register/i })).toBeVisible();
    });

    test('Healthcheck / API is responsive', async ({ request }) => {
        const response = await request.get(APP_URL);
        expect(response.ok()).toBeTruthy();
    });
});
