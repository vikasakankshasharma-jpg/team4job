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
        await this.page.goto(ROUTES.login);

        // Wait for page to load
        await this.page.waitForLoadState('networkidle');

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
        try {
            await this.page.waitForURL('**/dashboard**', { timeout: TIMEOUTS.medium });
        } catch (error) {
            // If redirect fails, capture current URL and page content for debugging
            const currentUrl = this.page.url();
            const pageText = await this.page.textContent('body');
            throw new Error(`Login failed. Current URL: ${currentUrl}. Page contains: ${pageText?.substring(0, 200)}`);
        }

        await expect(this.page).toHaveURL(/\/dashboard/);
    }

    async logout() {
        // Click user menu
        await this.page.click('[data-testid="user-menu"], button:has-text("Profile")').catch(() => {
            // Try alternative selector
            this.page.click('button:has([data-avatar])');
        });

        // Click logout
        await this.page.click('text=Logout, text=Log out').catch(() => {
            this.page.click('[role="menuitem"]:has-text("Logout")');
        });

        // Wait for redirect to login
        await this.page.waitForURL('**/login**', { timeout: TIMEOUTS.medium });
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
        await this.page.click(`label:has-text("${label}") ~ button, label:has-text("${label}") + button`);
        await this.page.click(`[role="option"]:has-text("${value}")`);
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
        await this.page.waitForLoadState('networkidle');
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
        await expect(this.page.locator(`text=${status}, [data-status="${status}"]`).first())
            .toBeVisible({ timeout });
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
        await this.page.waitForLoadState('networkidle');
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
