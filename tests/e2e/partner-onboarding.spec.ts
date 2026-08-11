import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E Test: Partner Onboarding
 * Verifies the complete onboarding wizard for Professionals.
 */

test.describe('Partner Onboarding Flow', () => {
    test('Complete onboarding wizard successfully', async ({ page }) => {
        const helper = new TestHelper(page);

        // 1. Setup: Reset Professional onboarding state via script
        try {
            execSync('npx tsx scripts/reset-installer-onboarding.ts', { stdio: 'inherit' });
        } catch (e) {
            console.log('Failed to reset onboarding state via script, continuing...', e);
        }

        // 2. Navigation: Login and go to onboarding
        await helper.auth.loginAsProfessional();
        await page.goto('/dashboard/onboarding');

        // 3. Step 1: Basic Info
        await page.locator('#firstName').clear();
        await page.locator('#firstName').fill('Pro');
        await page.locator('#lastName').clear();
        await page.locator('#lastName').fill('Professional');
        await page.locator('#shopName').clear();
        await page.locator('#shopName').fill('Pro CCTV Solutions');
        await page.locator('#city').clear();
        await page.locator('#city').fill('Bangalore');
        await page.locator('#pincode').clear();
        await page.locator('#pincode').fill('560001');

        await page.getByRole('button', { name: 'Next' }).click();

        // 4. Step 2: Experience & Skills
        await page.locator('#security').click({ force: true });
        await page.getByRole('button', { name: 'CCTV Installation' }).click();
        await page.getByRole('button', { name: 'Alarm Systems' }).click();
        await page.getByRole('button', { name: 'Next' }).click();

        // 5. Step 3: Documents (KYC)
        const mockFilePath = path.join(process.cwd(), 'tests/fixtures/dummy.png');

        // Upload Aadhar Front
        await page.locator('div.space-y-2').filter({ has: page.getByText('Aadhar Card (Front)') }).locator('input[type="file"]').setInputFiles(mockFilePath);
        await expect(page.locator('text=dummy.png').first()).toBeVisible({ timeout: 15000 });

        // Upload PAN Card
        await page.locator('div.space-y-2').filter({ has: page.getByText('PAN Card') }).locator('input[type="file"]').setInputFiles(mockFilePath);
        await expect(page.locator('text=dummy.png').nth(1)).toBeVisible({ timeout: 15000 });

        // Upload Profile Photo
        await page.locator('div.space-y-2').filter({ has: page.getByText('Profile Photo (Selfie)') }).locator('input[type="file"]').setInputFiles(mockFilePath);
        await expect(page.locator('text=dummy.png').nth(2)).toBeVisible({ timeout: 15000 });

        await page.getByRole('button', { name: 'Next' }).click();

        // 6. Step 4: Review and Submit
        await expect(page.getByText('Review Your Details')).toBeVisible();
        await page.getByRole('button', { name: 'Submit Application' }).click();

        // 7. Verification: Success Redirect and Toast
        await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60000 });

        // Use a more generic locator and wait for attachment to be extra resilient
        await expect(page.locator('text=Application Submitted!')).toBeVisible({ timeout: 20000 });
    });
});

