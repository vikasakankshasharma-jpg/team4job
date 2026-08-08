import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';

const iphone = { name: 'iPhone 13', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' };

test.describe('Mobile Omnichannel Auth UI (@mobile)', () => {
  test.use({ ...iphone });

  test('Signup flow shows Email, SMS, and WhatsApp verification buttons', async ({ page }) => {
    const helper = new TestHelper(page);
    await page.goto('/login?tab=signup');
    await helper.auth.injectNuclearCSS();
    await helper.acceptCookies();
    await page.waitForTimeout(500);
    
    // Choose Role (Client)
    await page.getByRole('button').filter({ hasText: /hire/i }).click();

    // Now on Contact Step
    // Wait for the form to render
    await expect(page.getByText(/Verify Your Contact Info/i)).toBeVisible();

    // Check Mobile Number input
    const mobileInput = page.getByPlaceholder('10-digit mobile number');
    await mobileInput.fill('9999999999');

    // The two buttons (SMS and WhatsApp) should appear
    await expect(page.getByRole('button', { name: 'SMS' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'WhatsApp' })).toBeVisible();

    // Check Email input
    const emailInput = page.getByPlaceholder('name@example.com');
    await emailInput.fill('test@example.com');

    // The Send OTP button for Email should appear
    await expect(page.getByRole('button', { name: /SEND OTP/i }).nth(0)).toBeVisible(); // This might grab the wrong one if there are multiple, but there is only one "SEND OTP" now because mobile has "SMS" and "WhatsApp"
  });

  test('Login flow supports OTP mode with dynamic channels', async ({ page }) => {
    const helper = new TestHelper(page);
    await page.goto('/login');
    await helper.auth.injectNuclearCSS();
    await helper.acceptCookies();
    await page.waitForTimeout(500);

    // Initially in password mode
    const loginIdentifier = page.getByTestId('login-identifier');
    await expect(loginIdentifier).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();

    // Toggle to OTP mode
    await page.getByRole('button', { name: /Login with OTP instead/i }).click();
    
    // Password should be hidden
    await expect(page.getByTestId('login-password')).toBeHidden();

    // Enter email
    await loginIdentifier.fill('test@example.com');
    // Should show "Send OTP via Email"
    await expect(page.getByRole('button', { name: /Send OTP via Email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send OTP via SMS/i })).toBeHidden();

    // Enter mobile
    await loginIdentifier.fill('');
    await loginIdentifier.fill('9999999999');
    // Should show SMS and WhatsApp
    await expect(page.getByRole('button', { name: /Send OTP via Email/i })).toBeHidden();
    await expect(page.getByRole('button', { name: /Send OTP via SMS/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send OTP via WhatsApp/i })).toBeVisible();
  });
});
