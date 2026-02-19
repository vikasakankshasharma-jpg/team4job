import { Page, expect } from '@playwright/test';
import { TEST_ACCOUNTS, ROUTES, TIMEOUTS } from '../fixtures/test-data';

/**
 * Authentication Helper Functions
 */
export class AuthHelper {
    constructor(private page: Page) { }

    private static seeded = false;

    private async seedTestUsers() {
        if (AuthHelper.seeded) return;
        try {
            const response = await this.page.request.post('/api/e2e/seed-users');
            if (response.ok()) {
                AuthHelper.seeded = true;
                console.log('[AuthHelper] Seeded test users.');
            } else {
                console.warn('[AuthHelper] Seed users call failed with status', response.status());
            }
        } catch (e) {
            console.warn('[AuthHelper] Seed users call failed:', e);
        }
    }

    async loginAsJobGiver() {
        await this.seedTestUsers();
        await this.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await this.ensureRole('Job Giver');
    }

    async loginAsInstaller() {
        await this.seedTestUsers();
        await this.login(TEST_ACCOUNTS.installer.email, TEST_ACCOUNTS.installer.password);
        await this.ensureRole('Installer');
    }

    async ensureRole(targetRole: 'Installer' | 'Job Giver') {
        const primaryIndicator = targetRole === 'Installer' ? 'Open Jobs' : 'Active Jobs';
        const secondaryIndicator = targetRole === 'Installer' ? 'Browse Jobs' : 'Post Job';

        try {
            console.log(`[AuthHelper] Verifying ${targetRole} dashboard...`);

            // Wait a bit for the page to settle
            await this.page.waitForTimeout(1000);

            // Check primary or secondary indicators (sidebar links usually load fast)
            const isInstaller = await this.page.getByText('Browse Jobs').first().isVisible() ||
                await this.page.getByText('Open Jobs').first().isVisible();
            const isJobGiver = await this.page.getByText('Post Job').first().isVisible() ||
                await this.page.getByText('Active Jobs').first().isVisible();

            const currentRoleMatched = (targetRole === 'Installer' && isInstaller) ||
                (targetRole === 'Job Giver' && isJobGiver);

            if (currentRoleMatched) {
                console.log(`[AuthHelper] Already in ${targetRole} mode.`);
                return;
            }

            console.log(`[AuthHelper] Role mismatch or indicators not found. Attempting role switch.`);

            // Click user menu
            const menuTrigger = this.page.getByTestId('user-menu-trigger').first();
            if (!(await menuTrigger.isVisible({ timeout: 5000 }))) {
                console.log(`[AuthHelper] User menu trigger not visible. Checking if we are on dashboard.`);
                if (this.page.url().includes('/dashboard')) return; // Assume okay if on dashboard
                throw new Error("User menu trigger not found.");
            }

            await menuTrigger.click();

            // Click the radio item for the role
            const menuText = targetRole === 'Installer' ? "Installer (Working)" : "Job Giver (Hiring)";
            const roleOption = this.page.getByText(menuText).first();

            if (await roleOption.isVisible({ timeout: 2000 })) {
                console.log(`[AuthHelper] Switching to role: ${menuText}`);
                await roleOption.click();
                await this.page.waitForURL(/\/dashboard/, { timeout: 10000 });
                // Small wait for state update
                await this.page.waitForTimeout(1000);
            } else {
                console.log(`[AuthHelper] Role option '${menuText}' NOT found. User may have only one role.`);
                await this.page.keyboard.press('Escape');

                // Final check: if we are on dashboard, just proceed
                if (this.page.url().includes('/dashboard')) {
                    console.log(`[AuthHelper] On dashboard. Proceeding as ${targetRole}.`);
                } else {
                    throw new Error(`Failed to ensure role ${targetRole}. Not on dashboard and switcher missing.`);
                }
            }
        } catch (e: any) {
            console.warn(`[AuthHelper] Warning in ensureRole for ${targetRole}:`, e.message);
            // Don't throw if we are on /dashboard, let the test attempt to proceed
            if (!this.page.url().includes('/dashboard')) {
                throw e;
            }
        }
    }

    async loginAsAdmin() {
        await this.seedTestUsers();
        await this.login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    }

    async login(email: string, password: string) {
        let attempts = 0;
        const maxRetries = 3;

        while (attempts < maxRetries) {
            attempts++;
            try {
                console.log(`[AuthHelper] Login attempt ${attempts}/${maxRetries} for ${email}`);

                // Navigate to login
                await this.page.goto(ROUTES.login);
                await this.page.waitForLoadState('load');

                // Force hide cookie banner to prevent interception
                await this.page.addStyleTag({ content: '.CookieConsent { display: none !important; }' });

                await this.acceptCookies(); // Still try to accept contextually

                // If redirected to dashboard, we ARE logged in. 
                // We check if it's the right mode later in the test via ensureRole.
                if (this.page.url().includes('dashboard')) {
                    console.log(`[AuthHelper] Already logged in to dashboard.`);
                    return;
                }

                // Fill email with retry on detachment
                const emailInput = this.page.locator('input[name="identifier"]');
                await emailInput.waitFor({ state: 'visible', timeout: 60000 });
                await emailInput.fill(email);

                // Fill password
                const passwordInput = this.page.locator('input[type="password"]');
                await passwordInput.fill(password);

                // Click submit button with robustness
                const submitButton = this.page.getByTestId('login-submit-btn').first();
                await submitButton.waitFor({ state: 'visible', timeout: 5000 });

                // Try normal click first, then force
                try {
                    await submitButton.click({ timeout: 2000 });
                } catch (e) {
                    console.log('[AuthHelper] Normal click failed, trying force click...');
                    await submitButton.click({ force: true });
                }

                // Wait for redirect to dashboard
                await this.page.waitForURL(/\/dashboard/, { timeout: TIMEOUTS.medium });
                console.log(`[AuthHelper] Login successful for ${email}`);
                return;
            } catch (error) {
                console.error(`[AuthHelper] Login attempt ${attempts} failed:`, error);

                // Screenshot on failure
                await this.page.screenshot({ path: `test-results/login-failure-${attempts}.png` });

                if (attempts === maxRetries) throw error;
                await this.page.waitForTimeout(2000);
                await this.page.reload();
            }
        }

        const currentUrl = this.page.url();
        const pageText = await this.page.textContent('body');
        throw new Error(`Login failed after ${maxRetries} attempts. Current URL: ${currentUrl}.`);
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

    async acceptCookies() {
        try {
            const acceptBtn = this.page.getByRole('button', { name: 'Accept All' }).first();
            if (await acceptBtn.isVisible({ timeout: 2000 })) {
                await acceptBtn.click();
                await acceptBtn.waitFor({ state: 'hidden', timeout: 2000 });
                console.log('[AuthHelper] Accepted cookies.');
            }
        } catch (e) {
            // Ignore
        }
    }
}

/**
 * Form Helper Functions
 */
export class FormHelper {
    constructor(private page: Page) { }

    async fillInput(label: string, value: string) {
        // Try getByLabel first (standard accessibility)
        try {
            const input = this.page.getByLabel(label).first();
            if (await input.isVisible({ timeout: 1000 })) {
                await input.fill(value);
                return;
            }
        } catch (e) {
            // Ignore and fallback
        }

        // Convert "Job Title" -> "jobTitle" (camelCase)
        const camelCase = label.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');
        // Convert "Job Title" -> "job-title" (kebab-case)
        const kebabCase = label.toLowerCase().replace(/\s+/g, '-');

        // Try data-testid
        const testIdInput = this.page.getByTestId(`${kebabCase}-input`).or(this.page.getByTestId(kebabCase)).first();
        if (await testIdInput.isVisible({ timeout: 1000 })) {
            await testIdInput.fill(value);
            return;
        }

        const input = this.page.locator(
            `label:has-text("${label}") ~ input, ` +
            `label:has-text("${label}") + input, ` +
            `label:has-text("${label}") + div input, ` +
            `div:has(label:has-text("${label}")) input, ` +
            `input[placeholder*="${label}"], ` +
            `input[name="${camelCase}"], ` +
            `input[name="${kebabCase}"], ` +
            `input[name*="${label.toLowerCase().replace(/\s/g, '')}"]`
        ).first();
        await input.fill(value);
        await input.blur(); // Trigger change/validation events
    }

    async fillTextarea(label: string, value: string) {
        // Try getByLabel first (standard accessibility)
        try {
            const textarea = this.page.getByLabel(label).first();
            if (await textarea.isVisible({ timeout: 1000 })) {
                await textarea.fill(value);
                return;
            }
        } catch (e) {
            // Ignore and fallback
        }

        // Expanded fallback locators for complex nesting (like Job Description with AI button)
        const textarea = this.page.locator(
            `label:has-text("${label}") ~ textarea, ` +
            `label:has-text("${label}") + textarea, ` +
            `label:has-text("${label}") + div textarea, ` +
            `div:has(label:has-text("${label}")) ~ div textarea, ` + // Label in sibling div
            `div:has(label:has-text("${label}")) + div textarea`
        ).first();
        await textarea.fill(value);
    }

    async selectDropdown(label: string, value: string) {
        // Find the trigger button associated with the label or follows it
        const trigger = this.page.locator(
            `label:has-text("${label}") ~ button, ` +
            `label:has-text("${label}") + div button, ` +
            `[data-testid*="${label.toLowerCase().replace(/\s/g, '-')}"] select-trigger, ` +
            `[data-testid*="${label.toLowerCase().replace(/\s/g, '-')}"], ` +
            `button:has-text("${label}")`
        ).first();

        // Ensure trigger is in view and clickable
        await trigger.scrollIntoViewIfNeeded();
        // Create a robust open loop
        let isOpen = false;
        for (let i = 0; i < 3; i++) {
            try {
                // Check if already open (sometimes previous actions leave it open)
                if (await this.page.locator('[role="option"], [role="menuitem"], .select-content').first().isVisible()) {
                    isOpen = true;
                    break;
                }

                await trigger.click({ force: true });
                // Short wait for animation/mounting
                await this.page.locator('[role="option"], [role="menuitem"], .select-content').first().waitFor({ state: 'visible', timeout: 2000 });
                isOpen = true;
                break;
            } catch (e) {
                console.log(`[FormHelper] Dropdown trigger click attempt ${i + 1} failed to open menu for "${label}".`);
                await this.page.waitForTimeout(500);
            }
        }

        if (!isOpen) {
            console.log('[FormHelper] Force dispatching click event as fallback...');
            await trigger.dispatchEvent('click');
        }

        // Try standard accessible role first with a reasonable timeout
        try {
            const option = this.page.getByRole('option', { name: value }).first();
            await option.waitFor({ state: 'visible', timeout: 10000 });
            await option.click({ force: true });
            return;
        } catch (e) {
            console.log(`[FormHelper] getByRole option failed for "${value}", trying fallback locators...`);
        }

        // Fallback to text matching across different possible roles
        const fallbackOption = this.page.locator(
            `[role="option"]:has-text("${value}"), ` +
            `[role="menuitem"]:has-text("${value}"), ` +
            `div[role="item"]:has-text("${value}"), ` +
            `button:has-text("${value}"), ` +
            `.select-item:has-text("${value}")`
        ).first();

        await fallbackOption.waitFor({ state: 'visible', timeout: 10000 });
        await fallbackOption.click({ force: true });
    }

    async fillPincodeAndSelectPO(pincode: string) {
        const pinInput = this.page.getByTestId('pincode-input').first();
        await pinInput.scrollIntoViewIfNeeded();
        await pinInput.fill(pincode);
        await pinInput.blur(); // Ensure change event fires

        // Wait for Loading spinner to disappear
        await expect(this.page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 }).catch(() => { });

        // Wait for API response and select trigger to become enabled/visible
        // Increasing timeout for slow CI networks
        const poTrigger = this.page.locator('[data-testid="po-select-trigger"], button[role="combobox"]:has-text("Select Post Office")').first();
        await expect(poTrigger).toBeVisible({ timeout: 20000 });

        // Wait for City input to be populated (indicates API success)
        console.log('[FormHelper] Waiting for location data to load...');
        const cityInput = this.page.locator('[data-testid="city-input"]');
        await expect(cityInput).not.toHaveValue('', { timeout: 15000 });

        const triggerText = await poTrigger.textContent();
        if (triggerText && !triggerText.includes('Select Post Office') && triggerText.trim().length > 0) {
            console.log("[FormHelper] Post Office already selected:", triggerText);
            return;
        }

        // Retry logic for clicking the trigger
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            try {
                await poTrigger.click({ force: true });
                console.log("[FormHelper] Pincode dropdown clicked, waiting for options...");

                // Wait for OPTION to be visible
                const option = this.page.locator('[data-testid="po-select-item"], [role="option"]').first();
                await option.waitFor({ state: 'visible', timeout: 8000 });

                const optionText = await option.textContent();
                console.log(`[FormHelper] Clicking post office option: ${optionText}`);
                await option.click({ force: true });

                // Wait for dropdown to close
                await expect(this.page.locator('[role="option"]')).not.toBeVisible({ timeout: 5000 }).catch(() => { });
                return; // Success
            } catch (e) {
                console.log(`[FormHelper] Pincode dropdown attempt ${i + 1} failed, trying keyboard fallback...`);
                // Keyboard fallback
                await poTrigger.focus();
                await this.page.keyboard.press('ArrowDown');
                await this.page.keyboard.press('Enter');

                // Check if selected
                const afterKeyboard = await poTrigger.textContent();
                if (afterKeyboard && !afterKeyboard.includes('Select Post Office')) {
                    console.log("[FormHelper] Pincode selected via keyboard.");
                    return;
                }

                if (i === maxRetries - 1) throw e;
                await this.page.waitForTimeout(1000);
            }
        }
    }

    async clickButton(text: string) {
        // Try data-testid first based on kebab-case
        const kebabText = text.toLowerCase().replace(/\s+/g, '-');
        const testIdButton = this.page.getByTestId(`${kebabText}-button`).or(this.page.getByTestId(`${kebabText}-btn`)).first();

        if (await testIdButton.isVisible({ timeout: 1000 })) {
            await testIdButton.click();
            return;
        }

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

    private async injectCookieHide() {
        await this.page.addStyleTag({ content: '.CookieConsent { display: none !important; }' }).catch(() => { });
    }

    async goToPostJob() {
        await this.page.goto(ROUTES.postJob);
        await this.page.waitForLoadState('domcontentloaded');
        await this.injectCookieHide();
    }

    async goToPostedJobs() {
        await this.page.goto(ROUTES.postedJobs);
        await this.page.waitForLoadState('load');
        await this.injectCookieHide();
    }

    async goToBrowseJobs() {
        await this.page.goto(ROUTES.browseJobs);
        await this.page.waitForLoadState('domcontentloaded');
        await this.injectCookieHide();
    }

    async goToMyBids() {
        await this.page.goto(ROUTES.myBids);
        await this.page.waitForLoadState('domcontentloaded');
        await this.injectCookieHide();
    }

    async goToTransactions() {
        await this.page.goto(ROUTES.transactions);
        await this.page.waitForLoadState('domcontentloaded');
        await this.injectCookieHide();
    }

    async goToDashboard() {
        await this.page.goto(ROUTES.dashboard);
        await this.page.waitForLoadState('domcontentloaded');
        await this.injectCookieHide();
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
            console.log(`Helper: Waiting for job status: ${status}. Timeout: ${timeout}ms`);

            // Try waiting initially
            try {
                await expect(this.page.locator(`[data-status="${status}"]`).first())
                    .toBeVisible({ timeout: 5000 }); // Short initial wait
                console.log(`Helper: Job status ${status} visible immediately.`);
                return;
            } catch (e) {
                console.log(`Helper: Status ${status} not immediately visible. Starting polling/reload loop...`);
            }

            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                console.log(`Helper: Checking for status ${status}...`);
                const isVisible = await this.page.locator(`[data-status="${status}"]`).first().isVisible();
                if (isVisible) {
                    console.log(`Helper: Job status ${status} found.`);
                    return;
                }

                // If not found, reload page to force fresh data fetch
                console.log(`Helper: Status not found. Reloading page to force refresh...`);
                await this.page.reload();
                await this.page.waitForLoadState('domcontentloaded');

                // Wait a bit for components to mount
                try {
                    await expect(this.page.locator(`[data-status="${status}"]`).first())
                        .toBeVisible({ timeout: 5000 });
                    console.log(`Helper: Job status ${status} visible after reload.`);
                    return;
                } catch (ignore) {
                    // Continue loop
                }
            }

            throw new Error(`Timeout waiting for status: ${status}`);

        } catch (error) {
            console.error(`Helper: Failed to find job status '${status}'.`);
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
            // Log ALL console messages to debug the login flow
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.error(`[Browser Error]: ${text}`);
            } else {
                console.log(`[Browser ${type.toUpperCase()}]: ${text}`);
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

    constructor(public page: Page) {
        this.auth = new AuthHelper(page);
        this.nav = new NavigationHelper(page);
        this.job = new JobHelper(page);
        this.form = new FormHelper(page);

        // Globally suppress cookie banner for all navigations
        this.page.addInitScript(() => {
            const style = document.createElement('style');
            style.innerHTML = '.CookieConsent { display: none !important; }';
            document.head.appendChild(style);
        });
        this.wait = new WaitHelper(page);
        this.debug = new DebugHelper(page);
        // Auto-enable console logging for debugging
        this.debug.logConsoleErrors();
        // Auto-mock external APIs (pincode) for stability in E2E runs
        void this.mockExternalAPIs().catch((e) => {
            console.warn('[TestHelper] Failed to set up external API mocks:', e);
        });
    }

    async mockExternalAPIs() {
        console.log('[TestHelper] Mocking external APIs (Pincode, etc)...');
        // Mock Pincode API
        // Mock Pincode API - Broad pattern
        await this.page.route('**/*pincode/*', async route => {
            const url = route.request().url();
            const pincode = url.split('/').pop();
            console.log(`[Mock] Intercepted Pincode request: ${pincode}`);

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    Message: "Number of post office(s) found: 2",
                    Status: "Success",
                    PostOffice: [
                        { Name: "Connaught Place", Description: null, BranchType: "Head Post Office", DeliveryStatus: "Delivery", Circle: "Delhi", District: "Central Delhi", Division: "New Delhi Central", Region: "Delhi", Block: "New Delhi", State: "Delhi", Country: "India", Pincode: "110001" },
                        { Name: "Sansad Marg", Description: null, BranchType: "Sub Post Office", DeliveryStatus: "Non-Delivery", Circle: "Delhi", District: "Central Delhi", Division: "New Delhi Central", Region: "Delhi", Block: "New Delhi", State: "Delhi", Country: "India", Pincode: "110001" }
                    ]
                }])
            });
        });
    }

    async acceptCookies() {
        console.log('[TestHelper] Checking for cookie consent banner...');
        try {
            const acceptBtn = this.page.getByRole('button', { name: 'Accept All' }).first();
            if (await acceptBtn.isVisible({ timeout: 5000 })) {
                await acceptBtn.click();
                await acceptBtn.waitFor({ state: 'hidden', timeout: 2000 });
                console.log('[TestHelper] Accepted cookies.');
            }
        } catch (e) {
            console.log('[TestHelper] Cookie banner not found or already accepted.');
        }
    }
}
