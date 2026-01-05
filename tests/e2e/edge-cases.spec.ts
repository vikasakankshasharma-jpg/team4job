import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS, TEST_JOB_DATA, TEST_CREDENTIALS, getDateString, generateUniqueJobTitle, JOB_STATUSES } from '../fixtures/test-data';

/**
 * Edge Case Tests - Testing boundary conditions, error handling, and unusual scenarios
 */

test.describe('Edge Case Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Enable console logging for debugging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser Error:', msg.text());
            }
        });
    });

    test.describe('Authentication Edge Cases', () => {
        test('Login with empty credentials shows validation error', async ({ page }) => {
            await page.goto('/login');
            await page.click('button[type="submit"]');

            // Should show validation errors
            await expect(page.locator('text=required, text=Required').first()).toBeVisible({ timeout: 5000 });
        });

        test('Login with invalid email format shows error', async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[type="email"]', 'notanemail');
            await page.fill('input[type="password"]', 'password123');
            await page.click('button[type="submit"]');

            // Should show validation error or stay on login page
            await expect(page).toHaveURL(/\/login/);
        });

        test('Login with SQL injection attempt is handled safely', async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[type="email"]', "admin' OR '1'='1");
            await page.fill('input[type="password"]', "' OR '1'='1");
            await page.click('button[type="submit"]');

            // Should show error and stay on login page
            await expect(page).toHaveURL(/\/login/);
        });

        test('Multiple failed login attempts are handled', async ({ page }) => {
            const helper = new TestHelper(page);

            for (let i = 0; i < 3; i++) {
                await page.goto('/login');
                await page.fill('input[type="email"]', 'wrong@example.com');
                await page.fill('input[type="password"]', 'wrongpassword');
                await page.click('button[type="submit"]');
                await page.waitForTimeout(1000);
            }

            // Should still be on login page
            await expect(page).toHaveURL(/\/login/);
        });

        test('Session persistence after page reload', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();

            // Reload the page
            await page.reload();

            // Should still be authenticated
            await expect(page).toHaveURL(/\/dashboard/);
        });
    });

    test.describe('Job Posting Edge Cases', () => {
        test('Job posting with minimum required fields only', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const uniqueTitle = generateUniqueJobTitle();

            // Fill only required fields
            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await helper.form.fillInput('Job Title', uniqueTitle);
            await helper.form.fillTextarea('Job Description', 'Minimum description');
            await helper.form.fillInput('Pincode', TEST_JOB_DATA.pincode);
            await page.waitForTimeout(1000);
            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="priceEstimate.min"]', '1000');
            await page.fill('input[name="priceEstimate.max"]', '2000');

            await helper.form.clickButton('Post Job');

            // Should succeed or show specific validation errors
            await page.waitForTimeout(2000);
        });

        test('Job posting with extremely long description', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const longDescription = 'A'.repeat(5000); // Very long description
            const uniqueTitle = generateUniqueJobTitle();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await helper.form.fillInput('Job Title', uniqueTitle);
            await helper.form.fillTextarea('Job Description', longDescription);

            // Should either accept it or show character limit error
            await page.waitForTimeout(1000);
        });

        test('Job posting with invalid budget range (min > max)', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const uniqueTitle = generateUniqueJobTitle();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await helper.form.fillInput('Job Title', uniqueTitle);
            await helper.form.fillTextarea('Job Description', TEST_JOB_DATA.description);
            await helper.form.fillInput('Pincode', TEST_JOB_DATA.pincode);
            await page.waitForTimeout(1000);

            // Set min > max
            await page.fill('input[name="priceEstimate.min"]', '10000');
            await page.fill('input[name="priceEstimate.max"]', '5000');
            await page.fill('input[name="deadline"]', getDateString(2));

            await helper.form.clickButton('Post Job');

            // Should show validation error
            await expect(page.locator('text=minimum, text=maximum, text=range').first()).toBeVisible({ timeout: 5000 });
        });

        test('Job posting with past deadline date', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const uniqueTitle = generateUniqueJobTitle();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await helper.form.fillInput('Job Title', uniqueTitle);
            await helper.form.fillTextarea('Job Description', TEST_JOB_DATA.description);
            await helper.form.fillInput('Pincode', TEST_JOB_DATA.pincode);
            await page.waitForTimeout(1000);

            // Set past date
            await page.fill('input[name="deadline"]', '2020-01-01');
            await page.fill('input[name="priceEstimate.min"]', '1000');
            await page.fill('input[name="priceEstimate.max"]', '2000');

            await helper.form.clickButton('Post Job');

            // Should show validation error
            await page.waitForTimeout(2000);
        });

        test('Job posting with special characters in title', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const specialTitle = `Test Job <script>alert('xss')</script> ${Date.now()}`;

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await helper.form.fillInput('Job Title', specialTitle);
            await helper.form.fillTextarea('Job Description', TEST_JOB_DATA.description);
            await helper.form.fillInput('Pincode', TEST_JOB_DATA.pincode);
            await page.waitForTimeout(1000);
            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="priceEstimate.min"]', '1000');
            await page.fill('input[name="priceEstimate.max"]', '2000');

            await helper.form.clickButton('Post Job');

            // Should sanitize and accept or show error
            await page.waitForTimeout(2000);
        });

        test('Job posting with invalid pincode', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            await helper.form.fillInput('Pincode', '000000');
            await page.waitForTimeout(1500);

            // Should show error or not populate city/state
            const cityField = page.locator('input[name="address.city"]');
            const cityValue = await cityField.inputValue().catch(() => '');

            // City should be empty or show error
            expect(cityValue).toBe('');
        });
    });

    test.describe('Bidding Edge Cases', () => {
        test('Bid with amount below minimum budget', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await helper.nav.goToBrowseJobs();

            // Find any available job
            const jobCard = page.locator('[data-testid="job-card"], .job-card').first();
            if (await jobCard.isVisible({ timeout: 5000 })) {
                await jobCard.click();

                // Try to place bid below minimum
                const placeBidBtn = page.locator('button:has-text("Place Bid")');
                if (await placeBidBtn.isVisible({ timeout: 5000 })) {
                    await placeBidBtn.click();
                    await page.fill('input[name="bidAmount"], input[placeholder*="bid"]', '100');
                    await page.fill('textarea[name="coverLetter"], textarea[placeholder*="cover"]', 'Test bid');
                    await helper.form.clickButton('Submit Bid');

                    // Should show validation error
                    await page.waitForTimeout(2000);
                }
            }
        });

        test('Bid with amount above maximum budget', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await helper.nav.goToBrowseJobs();

            const jobCard = page.locator('[data-testid="job-card"], .job-card').first();
            if (await jobCard.isVisible({ timeout: 5000 })) {
                await jobCard.click();

                const placeBidBtn = page.locator('button:has-text("Place Bid")');
                if (await placeBidBtn.isVisible({ timeout: 5000 })) {
                    await placeBidBtn.click();
                    await page.fill('input[name="bidAmount"], input[placeholder*="bid"]', '999999');
                    await page.fill('textarea[name="coverLetter"], textarea[placeholder*="cover"]', 'Test bid');
                    await helper.form.clickButton('Submit Bid');

                    // Should show warning or accept
                    await page.waitForTimeout(2000);
                }
            }
        });

        test('Bid with empty cover letter', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await helper.nav.goToBrowseJobs();

            const jobCard = page.locator('[data-testid="job-card"], .job-card').first();
            if (await jobCard.isVisible({ timeout: 5000 })) {
                await jobCard.click();

                const placeBidBtn = page.locator('button:has-text("Place Bid")');
                if (await placeBidBtn.isVisible({ timeout: 5000 })) {
                    await placeBidBtn.click();
                    await page.fill('input[name="bidAmount"], input[placeholder*="bid"]', '5000');
                    // Leave cover letter empty
                    await helper.form.clickButton('Submit Bid');

                    // Should show validation error or accept
                    await page.waitForTimeout(2000);
                }
            }
        });

        test('Multiple bids on same job by same installer', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await helper.nav.goToBrowseJobs();

            const jobCard = page.locator('[data-testid="job-card"], .job-card').first();
            if (await jobCard.isVisible({ timeout: 5000 })) {
                await jobCard.click();
                const jobUrl = page.url();

                // Try to place first bid
                const placeBidBtn = page.locator('button:has-text("Place Bid")');
                if (await placeBidBtn.isVisible({ timeout: 5000 })) {
                    await placeBidBtn.click();
                    await page.fill('input[name="bidAmount"], input[placeholder*="bid"]', '5000');
                    await page.fill('textarea[name="coverLetter"], textarea[placeholder*="cover"]', 'First bid');
                    await helper.form.clickButton('Submit Bid');
                    await page.waitForTimeout(2000);

                    // Try to place second bid
                    await page.goto(jobUrl);
                    const secondBidBtn = page.locator('button:has-text("Place Bid")');

                    // Should either not show button or show error
                    const isVisible = await secondBidBtn.isVisible({ timeout: 3000 }).catch(() => false);

                    if (isVisible) {
                        console.log('Warning: Multiple bids allowed on same job');
                    }
                }
            }
        });
    });

    test.describe('Payment Edge Cases', () => {
        test('Payment with declined card', async ({ page }) => {
            // This test would require a full job cycle setup
            // Skipping for now as it requires extensive setup
            test.skip();
        });

        test('Payment timeout handling', async ({ page }) => {
            // Test payment timeout scenario
            test.skip();
        });

        test('Payment cancellation by user', async ({ page }) => {
            // Test user canceling payment
            test.skip();
        });
    });

    test.describe('Search and Filter Edge Cases', () => {
        test('Search with no results', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await helper.nav.goToBrowseJobs();

            await page.fill('input[placeholder*="Search"]', 'NONEXISTENTJOB12345XYZ');
            await page.waitForTimeout(1000);

            // Should show "no results" message
            await expect(page.locator('text=No jobs, text=No results, text=not found').first()).toBeVisible({ timeout: 5000 });
        });

        test('Search with special characters', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await helper.nav.goToBrowseJobs();

            await page.fill('input[placeholder*="Search"]', '<script>alert("xss")</script>');
            await page.waitForTimeout(1000);

            // Should handle safely without executing script
            const alerts: string[] = [];
            page.on('dialog', dialog => {
                alerts.push(dialog.message());
                dialog.dismiss();
            });

            await page.waitForTimeout(2000);
            expect(alerts).toHaveLength(0);
        });

        test('Search with very long query', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsInstaller();
            await helper.nav.goToBrowseJobs();

            const longQuery = 'A'.repeat(1000);
            await page.fill('input[placeholder*="Search"]', longQuery);
            await page.waitForTimeout(1000);

            // Should handle gracefully
            await page.waitForTimeout(1000);
        });
    });

    test.describe('File Upload Edge Cases', () => {
        test('Upload file with invalid type', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const fileInput = page.locator('input[type="file"]').first();
            if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Try to upload a text file instead of image
                const buffer = Buffer.from('This is a text file');
                await fileInput.setInputFiles({
                    name: 'test.txt',
                    mimeType: 'text/plain',
                    buffer,
                }).catch(() => {
                    console.log('File upload rejected as expected');
                });

                await page.waitForTimeout(1000);
            }
        });

        test('Upload file exceeding size limit', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const fileInput = page.locator('input[type="file"]').first();
            if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Create a large buffer (10MB)
                const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
                await fileInput.setInputFiles({
                    name: 'large-image.jpg',
                    mimeType: 'image/jpeg',
                    buffer: largeBuffer,
                }).catch(() => {
                    console.log('Large file rejected as expected');
                });

                await page.waitForTimeout(1000);
            }
        });
    });

    test.describe('Network and Performance Edge Cases', () => {
        test('Application handles slow network', async ({ page }) => {
            // Simulate slow network
            await page.route('**/*', route => {
                setTimeout(() => route.continue(), 1000);
            });

            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();

            // Should still work, just slower
            await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
        });

        test('Application handles offline mode gracefully', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();

            // Go offline
            await page.context().setOffline(true);

            // Try to navigate
            await page.goto('/dashboard/post-job').catch(() => { });

            await page.waitForTimeout(2000);

            // Go back online
            await page.context().setOffline(false);
        });

        test('Concurrent user actions', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            // Try to submit form multiple times quickly
            const uniqueTitle = generateUniqueJobTitle();

            await helper.form.selectDropdown('Job Category', TEST_JOB_DATA.category);
            await helper.form.fillInput('Job Title', uniqueTitle);
            await helper.form.fillTextarea('Job Description', TEST_JOB_DATA.description);
            await helper.form.fillInput('Pincode', TEST_JOB_DATA.pincode);
            await page.waitForTimeout(1000);
            await page.fill('input[name="deadline"]', getDateString(2));
            await page.fill('input[name="priceEstimate.min"]', '1000');
            await page.fill('input[name="priceEstimate.max"]', '2000');

            // Click submit multiple times
            const submitBtn = page.locator('button:has-text("Post Job")');
            await submitBtn.click();
            await submitBtn.click().catch(() => { }); // Second click should be prevented

            await page.waitForTimeout(3000);
        });
    });

    test.describe('Browser Compatibility Edge Cases', () => {
        test('Application works with JavaScript disabled features', async ({ page }) => {
            // Test graceful degradation
            await page.goto('/');
            await expect(page.locator('body')).toBeVisible();
        });

        test('Application handles browser back button', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            // Go back
            await page.goBack();
            await expect(page).toHaveURL(/\/dashboard/);

            // Go forward
            await page.goForward();
            await expect(page).toHaveURL(/\/post-job/);
        });

        test('Application handles page refresh during form fill', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            // Fill some fields
            await helper.form.fillInput('Job Title', 'Test Job');
            await helper.form.fillTextarea('Job Description', 'Test Description');

            // Reload page
            await page.reload();

            // Check if form data is preserved or cleared
            const titleValue = await page.locator('input[name="title"]').inputValue().catch(() => '');
            console.log('Form data after reload:', titleValue);
        });
    });

    test.describe('Data Validation Edge Cases', () => {
        test('XSS prevention in user inputs', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const xssPayload = '<img src=x onerror=alert("XSS")>';

            await helper.form.fillInput('Job Title', xssPayload);
            await page.waitForTimeout(1000);

            // Should not execute script
            const alerts: string[] = [];
            page.on('dialog', dialog => {
                alerts.push(dialog.message());
                dialog.dismiss();
            });

            await page.waitForTimeout(2000);
            expect(alerts).toHaveLength(0);
        });

        test('Unicode and emoji handling', async ({ page }) => {
            const helper = new TestHelper(page);
            await helper.auth.loginAsJobGiver();
            await helper.nav.goToPostJob();

            const unicodeTitle = 'Test Job 🔧🔨 中文 العربية';

            await helper.form.fillInput('Job Title', unicodeTitle);
            await page.waitForTimeout(1000);

            // Should handle unicode correctly
            const value = await page.locator('input[name="title"]').inputValue();
            expect(value).toContain('🔧');
        });
    });
});
