import { Page, expect } from '@playwright/test';
import { TEST_ACCOUNTS, ROUTES, TIMEOUTS } from '../fixtures/test-data';

/**
 * Authentication Helper Functions
 */
export class AuthHelper {
    constructor(private page: Page) { }

    async loginAsJobGiver() {
        await this.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
    }

    async loginAsInstaller() {
        await this.login(TEST_ACCOUNTS.installer.email, TEST_ACCOUNTS.installer.password);
    }

    async loginAsAdmin() {
        await this.login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    }

    async login(email: string, password: string) {
        let attempts = 0;
        const maxRetries = 3;

        while (attempts < maxRetries) {
            attempts++;
            try {
                console.log(`[AuthHelper] Login attempt ${attempts}/${maxRetries} for ${email}`);
                await this.page.goto(ROUTES.login);

                // Wait for page to load
                await this.page.waitForLoadState('domcontentloaded');

                // Check if we were redirected to dashboard (already logged in)
                if (this.page.url().includes('dashboard')) {
                    console.log(`[AuthHelper] Already logged in (redirected to dashboard). Skipping login form.`);
                    return;
                }

                // Wait for network idle to ensure hydration
                await this.page.waitForLoadState('load');

                // Fill email
                const emailInput = this.page.locator('input[type="email"]');
                await emailInput.waitFor({ state: 'visible', timeout: TIMEOUTS.short });
                await emailInput.fill(email);

                // Fill password
                const passwordInput = this.page.locator('input[type="password"]');
                await passwordInput.waitFor({ state: 'visible', timeout: TIMEOUTS.short });
                await passwordInput.fill(password);

                // Click submit button - try multiple selectors
                const submitButton = this.page.locator('button[type="submit"]').first();
                await submitButton.waitFor({ state: 'visible', timeout: TIMEOUTS.short });
                await submitButton.click();

                // Wait for redirect to dashboard
                await this.page.waitForURL('**/dashboard**', { timeout: TIMEOUTS.long });
                await expect(this.page).toHaveURL(/\/dashboard/);

                // Robustness: Wait for Auth state to settle and persist
                console.log(`[AuthHelper] Waiting for Auth state to settle...`);
                await this.page.waitForTimeout(5000);

                // Wait for the badge to ensure hydration
                await expect(this.page.getByText(/Mode/)).toBeVisible({ timeout: TIMEOUTS.medium });

                console.log(`[AuthHelper] Login successful for ${email}`);
                return; // Success, exit loop
            } catch (error) {
                console.error(`[AuthHelper] Login attempt ${attempts} failed:`, error);
                if (attempts === maxRetries) {
                    // If last attempt failed, capture debug info and throw
                    const currentUrl = this.page.url();
                    const pageText = await this.page.textContent('body');
                    throw new Error(`Login failed after ${maxRetries} attempts. Current URL: ${currentUrl}. Page content preview: ${pageText?.substring(0, 200)}`);
                }
                // Wait briefly before retrying
                await this.page.waitForTimeout(2000);
            }
        }
    }

    async clearAuthPersistence() {
        console.log('[AuthHelper] Clearing auth persistence...');
        await this.page.evaluate(async () => {
            try {
                const databases = await window.indexedDB.databases();
                for (const db of databases) {
                    if (db.name?.includes('firebase')) {
                        window.indexedDB.deleteDatabase(db.name);
                    }
                }
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) {
                console.error('Error clearing auth persistence:', e);
            }
        });
        await this.page.reload();
        await this.page.waitForLoadState('domcontentloaded');
    }

    async logout() {
        console.log('[AuthHelper] Starting logout process...');
        try {
            // Click user menu - try multiple locators
            const userMenu = this.page.locator('[data-testid="user-menu-trigger"]')
                .or(this.page.locator('button.rounded-full:has(img)'))
                .or(this.page.locator('button:has(.rounded-full)'))
                .first();

            try {
                await userMenu.waitFor({ state: 'visible', timeout: 5000 });
                await userMenu.click();
                console.log('[AuthHelper] Clicked user menu');

                // Wait for dropdown content explicitly using robust locators
                const logoutMenuItem = this.page.getByRole('menuitem', { name: 'Logout' });
                const logoutText = this.page.getByText('Log out');
                const logoutButton = logoutMenuItem.or(logoutText).first();

                await logoutButton.waitFor({ state: 'visible', timeout: 5000 });

                // Click logout
                await logoutButton.click();
                console.log('[AuthHelper] Clicked logout button');

                // Wait for redirect to login (shorter timeout, we have fallback)
                await this.page.waitForURL('**/login**', { timeout: 10000 });
                console.log('[AuthHelper] Redirected to login page');
            } catch (e) {
                console.log('[AuthHelper] Logout UI interaction failed, forcing navigation to login...');
                throw e; // Re-throw to trigger catch block which forces navigation
            }
        } catch (error) {
            console.error('[AuthHelper] Logout failed:', error);
            // Force navigate to login if logout fails
            await this.page.goto(ROUTES.login);
        } finally {
            // ALWAYS clear persistence to prevent zombie sessions
            await this.clearAuthPersistence();
        }
    }
}

/**
 * Form Helper Functions
 */
export class FormHelper {
    constructor(private page: Page) { }

    async fillInput(label: string, value: string) {
        const input = this.page.locator(`label:has-text("${label}") ~ input, label:has-text("${label}") + input`).first();
        await input.fill(value);
    }

    async fillTextarea(label: string, value: string) {
        const textarea = this.page.locator(`label:has-text("${label}") ~ textarea, label:has-text("${label}") + textarea`).first();
        await textarea.fill(value);
    }

    async selectDropdown(label: string, value: string) {
        // Find the trigger button associated with the label or follows it
        const trigger = this.page.locator(`label:has-text("${label}")`).first();
        const parent = trigger.locator('..');
        const button = parent.locator('button[role="combobox"], button:has([data-state])').first();

        await button.click();

        // Wait for the dropdown content and find the option
        const option = this.page.locator(`[role="option"]:has-text("${value}"), [role="menuitem"]:has-text("${value}"), button:has-text("${value}")`).first();
        await option.click();
    }

    async clickButton(text: string) {
        await this.page.click(`button:has-text("${text}")`);
    }

    async waitForToast(message: string, timeout = TIMEOUTS.medium) {
        await expect(this.page.locator(`[role="status"]:has-text("${message}"), .toast:has-text("${message}")`).first())
            .toBeVisible({ timeout });
    }

    async waitForErrorToast(timeout = TIMEOUTS.medium) {
        await expect(this.page.locator('[role="status"][data-variant="destructive"], .toast-error').first())
            .toBeVisible({ timeout });
    }
}

/**
 * Navigation Helper Functions
 */
export class NavigationHelper {
    constructor(private page: Page) { }

    async goToPostJob() {
        await this.page.goto(ROUTES.postJob);
        await this.page.waitForLoadState('domcontentloaded');
    }

    async goToPostedJobs() {
        await this.page.goto(ROUTES.postedJobs);
        await this.page.waitForLoadState('load');
    }

    async goToBrowseJobs() {
        await this.page.goto(ROUTES.browseJobs);
        await this.page.waitForLoadState('domcontentloaded');
    }

    async goToMyBids() {
        await this.page.goto(ROUTES.myBids);
        await this.page.waitForLoadState('domcontentloaded');
    }

    async goToTransactions() {
        await this.page.goto(ROUTES.transactions);
        await this.page.waitForLoadState('domcontentloaded');
    }

    async goToDashboard() {
        await this.page.goto(ROUTES.dashboard);
        await this.page.waitForLoadState('domcontentloaded');
    }
}

/**
 * Job Helper Functions
 */
export class JobHelper {
    constructor(private page: Page) { }

    async getJobIdFromUrl(): Promise<string> {
        const url = this.page.url();
        const match = url.match(/\/jobs\/(JOB-[A-Z0-9-]+)/);
        return match ? match[1] : '';
    }

    async getJobIdFromCard(): Promise<string> {
        const jobCard = this.page.locator('[data-job-id]').first();
        return await jobCard.getAttribute('data-job-id') || '';
    }

    async clickJobCard(jobTitle: string) {
        await this.page.click(`[data-testid="job-card"]:has-text("${jobTitle}"), .job-card:has-text("${jobTitle}")`);
    }

    async waitForJobStatus(status: string, timeout = TIMEOUTS.long) {
        try {
            console.log(`Helper: Waiting for job status: ${status}`);
            // Use the data-status attribute for reliable selection
            await expect(this.page.locator(`[data-status="${status}"]`).first())
                .toBeVisible({ timeout });
            console.log(`Helper: Job status ${status} visible`);
        } catch (error) {
            console.error(`Helper: Failed to find job status '${status}'.`);
            // Check if it exists in DOM at all via JS execution
            const hasDataStatus = await this.page.evaluate((s) => !!document.querySelector(`[data-status="${s}"]`), status);
            console.log(`Helper: Document already contains [data-status="${status}"]: ${hasDataStatus}`);
            throw error;
        }
    }

    async getJobStatus(): Promise<string> {
        const statusElement = this.page.locator('[data-testid="job-status"], .job-status').first();
        return await statusElement.textContent() || '';
    }
}

/**
 * Wait Helper Functions
 */
export class WaitHelper {
    constructor(private page: Page) { }

    async waitForNetworkIdle() {
        await this.page.waitForLoadState('load');
    }

    async waitForElement(selector: string, timeout = TIMEOUTS.medium) {
        await this.page.waitForSelector(selector, { state: 'visible', timeout });
    }

    async waitForText(text: string, timeout = TIMEOUTS.medium) {
        await this.page.waitForSelector(`text=${text}`, { state: 'visible', timeout });
    }

    async waitForUrl(pattern: string | RegExp, timeout = TIMEOUTS.medium) {
        await this.page.waitForURL(pattern, { timeout });
    }
}

/**
 * Debug Helper Functions
 */
export class DebugHelper {
    constructor(private page: Page) { }

    async takeScreenshot(name: string) {
        await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
    }

    async logConsoleErrors() {
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser console error:', msg.text());
            }
        });
    }

    async logNetworkErrors() {
        this.page.on('requestfailed', request => {
            console.error('Network request failed:', request.url(), request.failure()?.errorText);
        });
    }

    async getPageErrors(): Promise<string[]> {
        return await this.page.evaluate(() => {
            const errors: string[] = [];
            // @ts-ignore
            if (window.errors) {
                // @ts-ignore
                errors.push(...window.errors);
            }
            return errors;
        });
    }
}

/**
 * Combined Test Helper Class
 */
export class TestHelper {
    auth: AuthHelper;
    form: FormHelper;
    nav: NavigationHelper;
    job: JobHelper;
    wait: WaitHelper;
    debug: DebugHelper;

    constructor(page: Page) {
        this.auth = new AuthHelper(page);
        this.form = new FormHelper(page);
        this.nav = new NavigationHelper(page);
        this.job = new JobHelper(page);
        this.wait = new WaitHelper(page);
        this.debug = new DebugHelper(page);
    }
}
