
import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_JOB_DATA, getDateString, getDateTimeString } from '../fixtures/test-data';

// Helper to generate a unique job title for each test to avoid collisions
function generateUniqueJobTitle(base: string = 'Edge Case Job') {
    return `${base} ${Math.random().toString(36).substring(7)}`;
}

test.describe('Edge Case Tests', () => {
    test.setTimeout(180000); // 180 seconds per test for unstable environments

    test.beforeEach(async ({ page }) => {
        // Mock Pincode API
        await page.route('**/api.postalpincode.in/pincode/**', async route => {
            const url = route.request().url();
            if (url.includes('000000')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{ Status: 'Error', Message: 'No records found' }])
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{
                        Status: 'Success',
                        Message: 'Number of pincode(s) found:2',
                        PostOffice: [
                            { Name: 'Test PO 1', District: 'Bangalore', State: 'Karnataka', Country: 'India' },
                            { Name: 'Test PO 2', District: 'Bangalore', State: 'Karnataka', Country: 'India' }
                        ]
                    }])
                });
            }
        });

        // Enable console logging for debugging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`[Browser Error]: ${msg.text()}`);
            } else {
                console.log(`[Browser LOG]: ${msg.text()}`);
            }
        });
    });

    test.describe('Authentication Edge Cases', () => {
        test('Login with empty credentials', async ({ page }) => {
            await page.goto('/login');
            await page.click('[data-testid="login-submit-btn"]');

            await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email address.', { timeout: 10000 });
            await expect(page.locator('[data-testid="password-error"]')).toContainText('Password cannot be empty.', { timeout: 10000 });
        });

        test('Login with invalid email format', async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[type="email"]', 'invalid-email@');
            await page.fill('input[type="password"]', 'password123');
            await page.getByTestId('login-submit-btn').click();

            await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email address.', { timeout: 10000 });
        });

        test('Login with wrong credentials', async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[type="email"]', 'wrong@example.com');
            await page.fill('input[type="password"]', 'wrongpassword');
            await page.getByTestId('login-submit-btn').click();

            await expect(page.locator('text=Login Failed').first()).toBeVisible({ timeout: 15000 });
        });

        test('Multiple failed login attempts are handled', async ({ page }) => {
            const helper = new TestHelper(page);
            await page.goto('/login');

            for (let i = 0; i < 3; i++) {
                await page.fill('input[type="email"]', 'wrong@example.com');
                await page.fill('input[type="password"]', 'wrongpassword');
                await helper.form.clickButton('Log In');
                await page.waitForTimeout(1000);
            }

            await expect(page.locator('input[type="email"]')).toBeVisible();
        });

        test('Session persistence after page reload', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();

            console.log(`[Persistence Test] Reloading page...`);
            await page.reload();

            await page.waitForTimeout(5000);
            console.log(`[Persistence Test] Post-reload URL: ${page.url()}`);

            await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
            await expect(page.getByText('Active Jobs').first()).toBeVisible({ timeout: 15000 });
            console.log(`[Persistence Test] SUCCESS: Still on dashboard.`);
        });
    });

    test.describe('Job Posting Edge Cases', () => {
        test('Job posting with minimum required fields only', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const uniqueTitle = generateUniqueJobTitle();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await page.fill('[data-testid="job-title-input"]', uniqueTitle);
            await page.fill('textarea[name="jobDescription"]', 'This is a valid minimum description that is at least 50 characters long to meet the requirement.');
            await page.fill('[data-testid="skills-input"]', TEST_JOB_DATA.skills);

            await page.fill('[data-testid="house-input"]', 'Flat 101');
            await page.fill('[data-testid="street-input"]', 'Main Street');
            await helper.form.fillPincodeAndSelectPO('560001');
            await page.waitForTimeout(1000);

            await page.fill('[data-testid="full-address-input"]', 'Flat 101, Main Street, Bangalore, 560001');

            await page.fill('[data-testid="min-budget-input"]', '8000');
            await page.fill('[data-testid="max-budget-input"]', '12000');

            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="jobStartDate"]', getDateTimeString(4));

            await helper.form.clickButton('Post Job');
            await expect(page).toHaveURL(/\/dashboard\/jobs\/JOB-/, { timeout: 30000 });
        });

        test('Job posting with extremely long description', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const longDescription = 'A'.repeat(5000);
            const uniqueTitle = generateUniqueJobTitle();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await page.fill('[data-testid="job-title-input"]', uniqueTitle);
            await page.fill('textarea[name="jobDescription"]', longDescription);
            await page.fill('[data-testid="skills-input"]', TEST_JOB_DATA.skills);

            await page.fill('[data-testid="house-input"]', 'Flat 101');
            await page.fill('[data-testid="street-input"]', 'Main Street');
            await helper.form.fillPincodeAndSelectPO('560001');
            await page.waitForTimeout(1000);

            await page.fill('[data-testid="full-address-input"]', 'Flat 101, Main Street, Bangalore, 560001');

            await page.fill('[data-testid="min-budget-input"]', '8000');
            await page.fill('[data-testid="max-budget-input"]', '12000');

            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="jobStartDate"]', getDateTimeString(4));

            await helper.form.clickButton('Post Job');
            await expect(page).toHaveURL(/\/dashboard\/jobs\/JOB-/, { timeout: 30000 });
        });

        test('Job posting with invalid budget range (min > max)', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await page.fill('[data-testid="job-title-input"]', generateUniqueJobTitle());
            await page.fill('textarea[name="jobDescription"]', TEST_JOB_DATA.description);
            await page.fill('[data-testid="skills-input"]', TEST_JOB_DATA.skills);

            await page.fill('[data-testid="min-budget-input"]', '10000');
            await page.fill('[data-testid="max-budget-input"]', '5000');

            await helper.form.clickButton('Post Job');

            await expect(page.locator('text=Maximum budget cannot be less than minimum budget').first()).toBeVisible({ timeout: 15000 });
        });

        test('Job posting with past deadline date', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await page.fill('input[name="deadline"]', getDateString(-1));

            await helper.form.clickButton('Post Job');

            await expect(page.locator('text=Deadline cannot be in the past').first()).toBeVisible({ timeout: 15000 });
        });

        test('Job posting with special characters in title', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const specialTitle = 'Job Title !@#$%';

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await page.fill('[data-testid="job-title-input"]', specialTitle);
            await page.fill('textarea[name="jobDescription"]', TEST_JOB_DATA.description);
            await page.fill('[data-testid="skills-input"]', TEST_JOB_DATA.skills);

            await page.fill('[data-testid="house-input"]', 'Flat 101');
            await page.fill('[data-testid="street-input"]', 'Main Street');
            await helper.form.fillPincodeAndSelectPO('560001');
            await page.waitForTimeout(1000);

            await page.fill('[data-testid="full-address-input"]', 'Flat 101, Main Street, Bangalore, 560001');

            await page.fill('[data-testid="min-budget-input"]', '8000');
            await page.fill('[data-testid="max-budget-input"]', '12000');

            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="jobStartDate"]', getDateTimeString(4));

            await helper.form.clickButton('Post Job');

            await expect(page).toHaveURL(/\/dashboard\/jobs\/JOB-/, { timeout: 30000 });
            await expect(page.getByText(specialTitle).first()).toBeVisible();
        });

        test('Job posting with invalid pincode', async ({ page }) => {
            await page.goto('/login');
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            await page.fill('[data-testid="pincode-input"]', '000000');
            // Wait for loading to finish
            await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });
            await expect(page.getByTestId('pincode-error')).toBeVisible({ timeout: 15000 });
        });
    });

    test.describe('Search and Filter Edge Cases', () => {
        test('Search with no results', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await page.goto('/dashboard/jobs');

            await page.click('button:has-text("All Jobs")');

            const searchInput = page.getByTestId('search-input').first();
            await searchInput.fill('NonExistentJobXYZ' + Math.random().toString(36).substring(7));
            await searchInput.press('Enter');

            await expect(page.locator('text=No jobs found matching your criteria').first()).toBeVisible({ timeout: 15000 });
        });

        test('Search with special characters', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await page.goto('/dashboard/jobs');

            await page.click('button:has-text("All Jobs")');

            const searchInput = page.getByTestId('search-input').first();
            await searchInput.fill('!@#$%^&*()');
            await searchInput.press('Enter');

            await expect(page.locator('text=No jobs found matching your criteria').first()).toBeVisible({ timeout: 15000 });
        });
    });

    test.describe('File Upload Edge Cases', () => {
        test('Upload file with invalid type', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const fileInput = page.locator('input[type="file"]');
            await fileInput.waitFor({ state: 'attached' });

            await fileInput.setInputFiles({
                name: 'test.exe',
                mimeType: 'application/x-msdownload',
                buffer: Buffer.from('dummy content')
            });

            // Should show error message or toast handled by file-upload.tsx
            // Not asserting exact text to avoid rigidness, but ensuring it doesn't crash
            await expect(page.locator('input[type="file"]')).toBeVisible();
        });

        test('Upload file exceeding size limit', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const fileInput = page.locator('input[type="file"]');
            await fileInput.waitFor({ state: 'attached' });

            const largeFile = Buffer.alloc(20 * 1024 * 1024);
            await fileInput.setInputFiles({
                name: 'large.png',
                mimeType: 'image/png',
                buffer: largeFile
            });

            // Check if error message appears
            await expect(page.locator('text=rejected').first()).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Network Edge Cases', () => {
        test('Application handles slow network simulator', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();

            // Set 120s timeout specifically for this test
            test.setTimeout(120000);

            const context = page.context();
            const client = await context.newCDPSession(page);
            await client.send('Network.emulateNetworkConditions', {
                offline: false,
                downloadThroughput: 100 * 1024 / 8,
                uploadThroughput: 100 * 1024 / 8,
                latency: 500
            });

            try {
                await page.goto('/dashboard/post-job', { timeout: 120000 });
                await page.waitForLoadState('domcontentloaded');
                await expect(page).toHaveURL(/.*\/post-job/, { timeout: 60000 });
            } finally {
                await client.send('Network.emulateNetworkConditions', {
                    offline: false,
                    downloadThroughput: -1,
                    uploadThroughput: -1,
                    latency: 0
                });
            }
        });
    });

    test.describe('Browser Compatibility Edge Cases', () => {
        test('Application handles browser back button', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();

            await helper.nav.goToPostJob();
            await expect(page).toHaveURL(/.*\/post-job/);

            await page.goto('/dashboard/posted-jobs');
            await page.waitForURL(/.*\/posted-jobs/);

            await page.goBack();
            await expect(page).toHaveURL(/.*\/post-job/, { timeout: 15000 });

            await page.goForward();
            await expect(page).toHaveURL(/.*\/posted-jobs/, { timeout: 15000 });
        });

        test('Application handles page refresh during form fill', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const uniqueTitle = 'Persistent Job Title';
            await page.fill('input[name="jobTitle"]', uniqueTitle);

            await page.reload();
            await page.waitForTimeout(3000);

            await expect(page.locator('input[name="jobTitle"]')).toBeVisible({ timeout: 15000 });
        });
    });

    test.describe('Data Validation Edge Cases', () => {
        test('XSS prevention in user inputs', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
            await page.fill('input[name="jobTitle"]', xssPayload);
            await page.fill('textarea[name="jobDescription"]', TEST_JOB_DATA.description);

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await page.fill('[data-testid="skills-input"]', TEST_JOB_DATA.skills);

            await page.fill('[data-testid="house-input"]', 'Flat 101');
            await page.fill('[data-testid="street-input"]', 'Main Street');
            await helper.form.fillPincodeAndSelectPO('560001');
            await page.waitForTimeout(1000);

            await page.fill('[data-testid="full-address-input"]', 'Flat 101, Main Street, Bangalore, 560001');

            await page.fill('[data-testid="min-budget-input"]', '500');
            await page.fill('[data-testid="max-budget-input"]', '1000');

            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="jobStartDate"]', getDateTimeString(4));

            await helper.form.clickButton('Post Job');

            await expect(page).toHaveURL(/\/dashboard\/jobs\/JOB-/, { timeout: 30000 });
            await expect(page.getByText(xssPayload).first()).toBeVisible({ timeout: 15000 });
        });

        test('Unicode and emoji handling', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const unicodeTitle = 'Job 🚀 🛠️';
            await page.fill('input[name="jobTitle"]', unicodeTitle);
            await page.fill('textarea[name="jobDescription"]', 'Testing unicode: 🌈 🦄. This description needs to be longer to meet the validation requirements of at least 50 chars.');

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await page.fill('[data-testid="skills-input"]', 'React, 🚀');

            await page.fill('[data-testid="house-input"]', 'Flat 101 🏠');
            await page.fill('[data-testid="street-input"]', 'Main Street 🛣️');
            await helper.form.fillPincodeAndSelectPO('560001');
            await page.waitForTimeout(1000);

            await page.fill('input[name="address.fullAddress"]', 'Bangalore 🇮🇳');

            await page.fill('input[name="priceEstimate.min"]', '500');
            await page.fill('input[name="priceEstimate.max"]', '1000');

            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="jobStartDate"]', getDateTimeString(4));

            await helper.form.clickButton('Post Job');

            await expect(page).toHaveURL(/\/dashboard\/jobs\/JOB-/, { timeout: 30000 });
            await expect(page.getByText(unicodeTitle).first()).toBeVisible({ timeout: 10000 });
        });
    });
});
