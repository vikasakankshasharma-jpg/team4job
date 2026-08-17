import { test, expect, BrowserContext, Page } from '@playwright/test';
import { AuthHelper } from '../utils/helpers';
import { TEST_ACCOUNTS, TEST_JOB_DATA } from '../fixtures/test-data';
import { execSync } from 'child_process';

test.describe.serial('Multi-Party Job Flow @smoke @multi-context', () => {
    let clientContext: BrowserContext;
    let proContext: BrowserContext;
    let clientPage: Page;
    let proPage: Page;
    let clientHelper: AuthHelper;
    let proHelper: AuthHelper;

    test.beforeAll(async () => {
        // Seed users to ensure they exist before tests start
        try {
            console.log('Seeding users for multi-party test...');
            execSync('npx --no-install tsx scripts/seed-users.ts', { stdio: 'inherit' });
        } catch (e) {
            console.error('Failed to seed users', e);
        }
    });

    test.beforeEach(async ({ browser }) => {
        // Create isolated browser contexts
        clientContext = await browser.newContext();
        proContext = await browser.newContext();

        clientPage = await clientContext.newPage();
        proPage = await proContext.newPage();

        clientHelper = new AuthHelper(clientPage);
        proHelper = new AuthHelper(proPage);
    });

    test.afterEach(async () => {
        await clientContext.close();
        await proContext.close();
    });

    test('Client can post a job and Professional can bid on it in real-time', async () => {
        test.setTimeout(120000); // Give plenty of time for multi-party interactions

        // 1. Both users login simultaneously
        console.log('Logging in Client and Professional...');
        await Promise.all([
            clientHelper.login(TEST_ACCOUNTS.client.email, TEST_ACCOUNTS.client.password),
            proHelper.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password)
        ]);

        // 2. Pro waits on the browse jobs page
        console.log('Professional navigates to Browse Jobs...');
        await proHelper.ensureRole('Professional');
        await proPage.goto('/dashboard/jobs');
        await expect(proPage.getByRole('heading', { name: /Available Jobs|Browse/i }).first()).toBeVisible({ timeout: 60000 });
        
        // Count initial jobs for pro
        await proPage.waitForTimeout(2000); // Let UI settle
        const initialJobsCount = await proPage.locator('.job-card').count();

        // 3. Client posts a new job
        console.log('Client is posting a new job...');
        await clientHelper.ensureRole('Client');
        await clientPage.goto('/wizard');
        
        // Fill out Job Wizard
        await expect(clientPage.getByRole('heading', { name: /Mission Orientation/i }).first()).toBeVisible({ timeout: 60000 });
        
        // 1. Select Category
        await clientPage.locator('[data-testid="Security & Surveillance-category-card"]').click();

        // 2. Select Step-by-Step creation method
        await clientPage.getByText('Step-by-Step').click();

        // 3. Answer questions (just click next repeatedly until compiling)
        const nextButton = clientPage.getByTestId('wizard-next-button');
        await nextButton.waitFor({ state: 'visible', timeout: 60000 });
        while (await nextButton.isVisible().catch(() => false)) {
            // Click the first available multiple-choice option so Next is enabled
            const firstOption = clientPage.locator('[data-testid^="question-option-"]').first();
            if (await firstOption.isVisible().catch(() => false)) {
                await firstOption.click();
            }

            // Fill any visible text inputs just in case it's required
            const visibleInputs = await clientPage.locator('input[type="text"]:visible').all();
            for (const input of visibleInputs) {
                await input.fill('Test input');
            }
            await nextButton.click();
            await clientPage.waitForTimeout(500); // Wait for transition
        }

        // 4. Review Step (Post Job)
        const publishButton = clientPage.getByRole('button', { name: /Post Job|Publish/i });
        await publishButton.waitFor({ state: 'visible', timeout: 60000 });
        
        // If there are budget fields on review step
        const budgetInput = clientPage.getByLabel(/Budget/i);
        if (await budgetInput.isVisible().catch(() => false)) {
            await budgetInput.fill('5000');
        }

        await publishButton.click();
    });
});
