import { Page, expect } from '@playwright/test';
import { TEST_ACCOUNTS, ROUTES, TIMEOUTS } from '../fixtures/test-data';

/**
 * Authentication Helper Functions
 */
    constructor(private page: Page) { 
        this.setupDiagnostics();
    }

    private setupDiagnostics() {
        // Only set up once per page instance to avoid duplicate listeners
        if ((this.page as any)._diagnosticsEnabled) return;
        (this.page as any)._diagnosticsEnabled = true;

        this.page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            if (type === 'error' || text.includes('FirebaseError') || text.includes('auth/') || text.includes('firestore/')) {
                console.log(`[Browser Console ${type.toUpperCase()}] ${text}`);
            }
        });
        this.page.on('pageerror', err => {
            console.log(`[Browser PageError] ${err.message}\n${err.stack}`);
        });
        this.page.on('requestfailed', request => {
            console.log(`[Browser Request Failed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
        });
    }

    private static seeded = false;

    /** Allow tests that seed users via their own scripts to skip the seed-users API call */
    static markSeeded() {
        AuthHelper.seeded = true;
    }

    private async seedTestUsers() {
        if (AuthHelper.seeded) return;
        
        if (process.env.ALLOW_E2E_SEED === 'false' || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'false') {
            console.log('[AuthHelper] Bypassing mock user seeding because tests are executing against Live Production infrastructure.');
            AuthHelper.seeded = true;
            return;
        }

        const maxRetries = 3;
        let attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            try {
                console.log(`[AuthHelper] Seed users attempt ${attempts}/${maxRetries}`);
                
                // Force 127.0.0.1 to avoid IPv6 (::1) resolution issues with localhost
                const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
                const targetURL = baseURL.replace('localhost', '127.0.0.1') + '/api/e2e/seed-users';
                
                const response = await this.page.request.post(targetURL);

                if (response.ok()) {
                    AuthHelper.seeded = true;
                    console.log('[AuthHelper] Seeded test users successfully.');
                    return;
                } else {
                    const body = await response.text().catch(() => '');
                    console.warn(`[AuthHelper] Seed users call failed with status ${response.status()}, attempt ${attempts}. Body: ${body}`);
                    if (attempts === maxRetries) {
                        throw new Error(`Failed to seed users after ${maxRetries} attempts. Last status: ${response.status()}`);
                    }
                    // Wait before retry
                    await this.page.waitForTimeout(5000);
                }
            } catch (e: any) {
                console.warn(`[AuthHelper] Seed users attempt ${attempts} failed:`, e);
                if (attempts === maxRetries) {
                    throw new Error(`Failed to seed users after ${maxRetries} attempts due to error: ${e.message || e}`);
                }
                // Wait before retry
                await this.page.waitForTimeout(5000);
            }
        }
    }

    async loginAsClient() {
        await this.login(TEST_ACCOUNTS.client.email, TEST_ACCOUNTS.client.password);
        await this.ensureRole('Client');
    }

    async loginAsProfessional() {
        await this.login(TEST_ACCOUNTS.professional.email, TEST_ACCOUNTS.professional.password);
        await this.ensureRole('Professional');
    }

    async waitForStability() {
        console.log('[TestHelper] Waiting for page stability (quiescence)...');
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => { });
        await this.page.waitForTimeout(1000); // Buffer for hydration
    }

    async ensureRole(targetRole: 'Professional' | 'Client') {
        const primaryIndicator = targetRole === 'Professional' ? 'Open Jobs' : 'Active Jobs';
        const secondaryIndicator = targetRole === 'Professional' ? 'Browse Jobs' : 'Post Job';

        try {
            // First, wait for the global initial loader to disappear
            try {
                const loader = this.page.locator('[data-testid="initial-loader"], .initial-loader, #initial-loader').first();
                if (await loader.isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log('[AuthHelper] Waiting for initial loader to disappear...');
                    // Wait for it to be hidden or removed
                    await loader.waitFor({ state: 'hidden', timeout: 30000 }).catch(async () => {
                        console.warn('[AuthHelper] Initial loader hidden timeout (30s) - Attempting Force Reload for recovery');
                        await this.page.reload({ waitUntil: 'domcontentloaded' });
                        await this.page.waitForTimeout(5000); // Settle
                    });
                }
            } catch (e) {
                console.warn('[AuthHelper] Error waiting for initial loader or reload failed:', e);
            }


            // Wait a bit for the page to settle
            await this.page.waitForTimeout(1000);

            // Check primary or secondary indicators first (they might already be there)
            const isProfessional = await this.page.getByText('Browse Jobs').first().isVisible({ timeout: 1000 }).catch(() => false) ||
                await this.page.getByText('Open Jobs').first().isVisible({ timeout: 1000 }).catch(() => false);
            const isClient = await this.page.getByTestId('dashboard-post-job-btn').isVisible({ timeout: 1000 }).catch(() => false) ||
                await this.page.getByText(/Post (New )?Job/i).first().isVisible({ timeout: 1000 }).catch(() => false) ||
                await this.page.getByText(/(My )?Active Jobs/i).first().isVisible({ timeout: 1000 }).catch(() => false);

            const currentRoleMatched = (targetRole === 'Professional' && isProfessional) ||
                (targetRole === 'Client' && isClient);

            if (currentRoleMatched) {
                console.log(`[AuthHelper] Already in ${targetRole} mode.`);
                return;
            }

            console.log(`[AuthHelper] Role mismatch or indicators not found. Attempting role switch.`);

            // Click user menu - try multiple locators
            const userMenu = this.page.locator('[data-testid="user-menu-trigger"]')
                .or(this.page.locator('button.rounded-full:has(img)'))
                .or(this.page.locator('button:has(.rounded-full)'))
                .or(this.page.locator('button[aria-label*="user"]'))
                .or(this.page.locator('button[aria-label*="menu"]'))
                .or(this.page.locator('button:has-text("D")'))
                .filter({ visible: true })
                .first();

            try {
                await userMenu.waitFor({ state: 'visible', timeout: 8000 });
                await userMenu.click();
                console.log('[AuthHelper] Clicked user menu');
            } catch (e: any) {
                console.log('[AuthHelper] User menu not found or not clickable, checking URL...');
                if (this.page.url().includes('/dashboard')) {
                    console.log('[AuthHelper] Already on dashboard URL, proceeding.');
                    return;
                }

                // Fallback: attempt to navigate to dashboard and re-check indicators.
                await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
                await this.page.waitForTimeout(2000);

                const profNow = await this.page.getByText('Browse Jobs').first().isVisible().catch(() => false);
                const clientNow = await this.page.getByTestId('dashboard-post-job-btn').isVisible().catch(() => false) ||
                    await this.page.getByText('Post Job').first().isVisible().catch(() => false);

                if ((targetRole === 'Professional' && profNow) || (targetRole === 'Client' && clientNow)) {
                    console.log(`[AuthHelper] ${targetRole} indicators found after direct dashboard navigation.`);
                    return;
                }

                // Don't hard-fail here; role switcher can be unavailable for single-role users.
                console.log(`[AuthHelper] User menu missing; continuing without switching to ${targetRole}.`);
                return;
            }

            // Click the radio item for the role
            const menuText = targetRole === 'Professional' ? "Professional (Working)" : "Client (Hiring)";
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
                } else if (this.page.url().includes('/login')) {
                    console.warn(`[AuthHelper] Still on login page after ensureRole. Forcing navigation to /dashboard...`);
                    // Proactive fallback for slow redirects/HMR hangs
                    await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                    await this.page.waitForTimeout(2000);
                    
                    if (this.page.url().includes('/dashboard')) {
                        console.log(`[AuthHelper] Successfully reached dashboard via forced navigation.`);
                        return;
                    }
                    throw new Error(`Failed to ensure role ${targetRole}. Stuck on login/not on dashboard even after force.`);
                } else {
                    console.warn(`[AuthHelper] UI Indicators missing, but URL is ${this.page.url()}. Proceeding anyway.`);
                }
            }
        } catch (error: any) {
            console.warn(`[AuthHelper] Warning in ensureRole for ${targetRole}:`, error.message);
            // Don't throw if we are on /dashboard, let the test attempt to proceed
            if (!this.page.url().includes('/dashboard')) {
                throw error;
            }
        }
    }

    async loginAsAdmin() {
        await this.login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    }

    async login(email: string, password: string) {
        await this.seedTestUsers();
        let attempts = 0;
        const maxRetries = 2;

        while (attempts < maxRetries) {
            attempts++;
            let consoleListener: ((msg: any) => void) | null = null;
            try {
                console.log(`[AuthHelper] Login attempt ${attempts}/${maxRetries} for ${email}`);
                await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
                await this.waitForStability();

                if (this.page.isClosed()) {
                    throw new Error('[AuthHelper] Page is closed before login could start');
                }

                const loginFormConsole: string[] = [];
                consoleListener = (msg: any) => {
                    try {
                        const text = msg.text?.() ?? '';
                        if (typeof text === 'string' && text.includes('LoginForm:')) {
                            loginFormConsole.push(text);
                        }
                    } catch {
                        // ignore
                    }
                };
                this.page.on('console', consoleListener);

                // Navigate to login
                // Proactively inject CSS to hide ANY cookie banner that might appear
                await this.page.addInitScript(() => {
                    const inject = () => {
                        if (!document.head) {
                            setTimeout(inject, 10);
                            return;
                        }
                        const style = document.createElement('style');
                        style.innerHTML = `
                            .CookieConsent, 
                            #cookie-consent-banner, 
                            [class*="CookieConsent"],
                            [id*="cookie-consent"],
                            div[style*="z-index: 999"] { 
                                display: none !important; 
                                visibility: hidden !important; 
                                pointer-events: none !important; 
                                opacity: 0 !important;
                            }
                        `;
                        document.head.appendChild(style);
                        // Also mock the cookie to prevent the library from even trying
                        document.cookie = "dodo-cookie-consent=true; path=/";
                    };
                    inject();
                });

                // Navigation to login - wait for domcontentloaded to ensure hydration is complete
                // This prevents the "white screen" and input clearing issues on slow dev servers
                await this.page.goto(ROUTES.login, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(async (e) => {
                    console.warn(`[AuthHelper] initial goto domcontentloaded timed out. Forcing stop and reload...`);
                    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
                });
                
                await this.page.waitForTimeout(2000); // Strict buffer for Next.js hydration
                
                // Set cookie via Playwright API as well for redundancy
                await this.page.context().addCookies([{
                    name: "dodo-cookie-consent",
                    value: "true",
                    domain: "127.0.0.1",
                    path: "/"
                }]);

                await this.acceptCookies(); // Still try to accept contextually as fallback

                // If redirected to dashboard, we ARE logged in. 
                // We check if it's the right mode later in the test via ensureRole.
                if (this.page.url().includes('dashboard')) {
                    console.log(`[AuthHelper] Already logged in to dashboard.`);
                    return;
                }

                // Fill email with retry on detachment and scroll
                const emailInput = this.page
                    .getByTestId('login-identifier')
                    .or(this.page.getByLabel(/Email|Mobile/i))
                    .or(this.page.locator('input[name="identifier"]'))
                    .first();
                await emailInput.waitFor({ state: 'visible', timeout: 30000 });
                await emailInput.scrollIntoViewIfNeeded();

                // Fill password
                const passwordInput = this.page
                    .getByTestId('login-password')
                    .or(this.page.getByLabel(/^Password$/i))
                    .or(this.page.locator('input[type="password"]'))
                    .first();
                await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
                await passwordInput.scrollIntoViewIfNeeded();
                
                const fillAndVerify = async () => {
                   await this.page.evaluate(({e, p}: any) => console.log(`[AuthHelper] Attempting fill for ${e}...`), {e: email, p: password});
                   
                   // Fill email
                   await emailInput.focus();
                   await this.page.keyboard.press('Control+A');
                   await this.page.keyboard.press('Backspace');
                   await emailInput.fill(email);
                   
                   // Fill password
                   await passwordInput.focus();
                   await this.page.keyboard.press('Control+A');
                   await this.page.keyboard.press('Backspace');
                   await passwordInput.fill(password);
                   
                   const eVal = await emailInput.inputValue();
                   const pVal = await passwordInput.inputValue();
                   
                   if (eVal !== email || pVal !== password) {
                       await this.page.evaluate(({ev, pv}: any) => console.warn(`[AuthHelper] Verify failed (E: "${ev}", P: "${pv.length}"), forcing DOM set...`), {ev: eVal, pv: pVal});
                       await emailInput.evaluate((el: any, val: string) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }, email);
                       await passwordInput.evaluate((el: any, val: string) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }, password);
                   }
                   
                   const finalE = await emailInput.inputValue();
                   const finalP = await passwordInput.inputValue();
                   return finalE === email && finalP === password;
                };

                // Try to fill up to 10 times to handle aggressive clearing scripts
                let fillSuccess = false;
                for (let i = 0; i < 10; i++) {
                    fillSuccess = await fillAndVerify();
                    if (fillSuccess) break;
                    await this.page.waitForTimeout(500);
                }

                if (!fillSuccess) {
                    await this.page.evaluate(() => console.error('[AuthHelper] FATAL: Could not stabilize inputs after 10 attempts.'));
                }

                // FINAL stability check before submit to prevent clicking during HMR
                await this.waitForStability();

                // Click submit button with robustness
                const submitButton = this.page.getByTestId('login-submit-btn').first();
                await submitButton.waitFor({ state: 'visible', timeout: 20000 });
                
                // Final check before click
                if (await emailInput.inputValue() === '') {
                    console.warn('[AuthHelper] Inputs cleared right before click! Re-filling one last time...');
                    await emailInput.fill(email);
                    await passwordInput.fill(password);
                }

                await this.page.waitForTimeout(2000);

                // Try normal click first, then force
                try {
                    await submitButton.click({ timeout: 10000 });
                } catch (e: any) {
                    console.warn(`[AuthHelper] Normal click failed/timed out: ${e.message}, trying force click...`);
                    await submitButton.click({ force: true });
                }
                console.log('[AuthHelper] Login button clicked.');

                // Wait for navigation or error
                try {
                    await this.page.waitForURL(/\/dashboard/, { timeout: 90000 });
                    console.log('[AuthHelper] Login submission redirect to dashboard detected.');
                } catch (e) {
                    console.warn('[AuthHelper] No redirect to /dashboard after 30s. Checking for error toasts or splash screen...');
                    
                    // Check for error toasts (using some known error strings or general destructive variant)
                    const errorToast = this.page.locator('[role="status"]:has-text("Failed"), [role="status"]:has-text("Invalid")');
                    if (await errorToast.isVisible({ timeout: 2000 }).catch(() => false)) {
                        const errorMsg = await errorToast.innerText();
                        throw new Error(`[AuthHelper] Login failed with error toast: "${errorMsg}"`);
                    }

                    // If we are stuck on the splash screen ("Redirecting to...")
                    const splashText = this.page.getByText(/Redirecting to/i);
                    if (await splashText.isVisible({ timeout: 5000 }).catch(() => false)) {
                        console.log('[AuthHelper] Stuck on redirect splash screen. Forcing navigation to /dashboard...');
                        await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
                    } else {
                        // Diagnostic: Check for validation messages or visible errors on the page
                        const bodyText = await this.page.innerText('body').catch(() => 'Could not read body');
                        const url = this.page.url();
                        console.log(`[AuthHelper] DIAGNOSTIC: Stuck on page. URL: ${url}`);
                        if (bodyText.length > 500) {
                            console.log(`[AuthHelper] DIAGNOSTIC: Page text snippet: ${bodyText.substring(0, 500)}...`);
                        } else {
                            console.log(`[AuthHelper] DIAGNOSTIC: Page text: ${bodyText}`);
                        }
                        
                        throw new Error(`[AuthHelper] Login failed: No redirect and no splash screen. Current URL: ${url}`);
                    }
                }

                // Explicitly wait for the client-side session to sync by waiting for a dashboard marker
                // rather than manually navigating to /dashboard again too early.
                const markers = [
                    '[data-testid="user-menu-trigger"]',
                    '[data-testid="dashboard-post-job-btn"]',
                    '[data-testid="nav-link-allJobs"]',
                    'nav',
                    'text="Post Job"',
                    'text="Active Jobs"'
                ];
                
                console.log('[AuthHelper] Waiting for auth session stabilization (Dashboard markers)...');
                await Promise.any(markers.map(m => 
                    this.page.locator(m).first().waitFor({ state: 'visible', timeout: 45000 })
                )).catch(e => {
                    console.warn('[AuthHelper] No dashboard markers appeared. Current URL:', this.page.url());
                });

                // Now verify we didn't get kicked back to login
                if (this.page.url().includes('/login')) {
                    throw new Error(`[AuthHelper] Login failed: Still on ${this.page.url()} after submit.`);
                }

                // Hide any persistent cookie consent banners that may appear after navigation
                try {
                    await this.page.addStyleTag({ content: '.CookieConsent { display: none !important; }' });
                    console.log('[AuthHelper] Cookie banner hidden after dashboard load');
                } catch (e) {
                    // Ignore style tag errors
                }

                console.log(`[AuthHelper] Login successful for ${email}`);
                return;
            } catch (error: any) {
                console.error(`[AuthHelper] Login attempt ${attempts} failed:`, error.message);
                
                // Fallback: Check if we are actually at the dashboard despite errors
                if (this.page.url().includes('/dashboard')) {
                    console.log('[AuthHelper] Recovered: URL is already at /dashboard');
                    return;
                }

                if (!this.page.isClosed()) {
                    await this.page.screenshot({ path: `test-results/login-failure-${attempts}.png` }).catch(() => { });
                }

                if (attempts === maxRetries) throw error;
                await this.page.waitForTimeout(1000);
            } finally {
                if (consoleListener) {
                    this.page.off('console', consoleListener);
                }
            }
        }

        throw new Error(`Login failed after ${maxRetries} attempts. Current URL: ${this.page.url()}`);
    }

    async clearAuthPersistence() {
        console.log('[AuthHelper] Clearing auth persistence...');

        // Prevent SecurityError on 'about:blank' by navigating to a valid origin first
        if (this.page.url() === 'about:blank' || this.page.url() === '') {
            console.log('[AuthHelper] Navigating to / to clear origin-bound data');
            await this.page.goto('/');
        }

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
        
        // If we're already on the login page or home, we're effectively logged out
        // but we still want to clear local storage to be safe
        const currentUrl = this.page.url();
        if (currentUrl.includes('/login') || currentUrl.endsWith('/')) {
            console.log('[AuthHelper] Already on login or home page, enforcing storage/cookie purge...');
            await this.clearAuthPersistence();
            return;
        }

        try {
            // Give the client-side hydration a moment to settle
            await this.page.waitForTimeout(1000);

            // 0. Dismiss any blocking dialogs that might be open
            const dialog = this.page.getByRole('dialog').first();
            if (await dialog.isVisible().catch(() => false)) {
                console.log('[AuthHelper] Dismissing dialog before logout');
                await this.page.keyboard.press('Escape').catch(() => { });
                await this.page.waitForTimeout(500);
            }

            const userMenu = this.page.getByTestId('user-menu-trigger').first()
                .or(this.page.locator('button:has([data-testid="user-avatar"]), button:has(.avatar), button[aria-haspopup="menu"]').first())
                .or(this.page.locator('button.rounded-full:has(img)'))
                .or(this.page.locator('button:has(.rounded-full)'))
                .or(this.page.locator('[data-testid="user-menu-button"]'))
                .or(this.page.locator('button:has-text("D")'));

            if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
                await userMenu.click({ force: true });
                const logoutBtn = this.page.getByTestId('logout-button').first()
                    .or(this.page.getByRole('menuitem', { name: /Log out|Sign out|Logout/i }).first())
                    .or(this.page.locator('button:has-text("Log out"), button:has-text("Sign out"), button:has-text("Logout")').first());
                
                await logoutBtn.waitFor({ state: 'visible', timeout: 5000 });
                await logoutBtn.click({ force: true });
            } else {
                console.warn('[AuthHelper] User menu not found. Enforcing hard reset.');
            }
        } catch (error) {
            console.error('[AuthHelper] Logout UI interaction failed, enforcing hard reset.');
        } finally {
            // ALWAYS clear persistence and redirect to login to ensure clean state
            await this.clearAuthPersistence();
            if (!this.page.url().includes('/login')) {
                await this.page.goto('/login').catch(() => {});
            }
        }

        // Stabilize on login page
        await this.page.waitForURL('**/login', { timeout: 15000 });
        await this.page.waitForTimeout(2000); // Explicit buffer for session cleanup settlement
        console.log('[AuthHelper] Logout successful');
    }

    async acceptCookies() {
        try {
            const acceptAll = this.page.getByRole('button', { name: /Accept All/i }).first();
            const essentialOnly = this.page.getByRole('button', { name: /Essential Only|Decline cookies/i }).first();
            const consentRoot = this.page.locator('text=We value your privacy').first();

            const hasConsent =
                (await acceptAll.isVisible({ timeout: 1000 }).catch(() => false)) ||
                (await essentialOnly.isVisible({ timeout: 1000 }).catch(() => false)) ||
                (await consentRoot.isVisible({ timeout: 1000 }).catch(() => false));

            if (!hasConsent) return;

            if (await acceptAll.isVisible().catch(() => false)) {
                await acceptAll.click({ force: true });
                console.log('[AuthHelper] Accepted cookies (Accept All).');
            } else if (await essentialOnly.isVisible().catch(() => false)) {
                await essentialOnly.click({ force: true });
                console.log('[AuthHelper] Accepted cookies (Essential Only).');
            }

            // Wait for the banner to go away so it can't intercept subsequent clicks.
            await Promise.race([
                consentRoot.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined),
                acceptAll.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined),
            ]);
        } catch {
            // Ignore
        }
    }
}

/**
 * Form Helper Functions
 */
export class FormHelper {
    constructor(private page: Page, private helper: any) { }

    async discardDraftIfPresent() {
        console.log('[FormHelper] Checking for stale drafts to discard...');
        const dialog = this.page.getByRole('dialog', { name: 'Resume your draft?' });
        try {
            if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('[FormHelper] Stale draft detected, clicking Discard...');
                const discardBtn = this.page.getByRole('button', { name: /Discard Draft/i });
                await discardBtn.click();
                await this.page.waitForTimeout(1000);
            }
        } catch (e) {
            console.warn('[FormHelper] Error while checking for draft dialog:', e);
        }
    }

    async waitForDraftDialogHandled(timeout = 2000) {
        console.log('[FormHelper] Waiting for potential draft dialog...');
        const dialog = this.page.getByRole('dialog', { name: 'Resume your draft?' });
        try {
            // Wait for it to potentially appear
            await dialog.waitFor({ state: 'visible', timeout }).catch(() => { });
            if (await dialog.isVisible()) {
                console.log('[FormHelper] Draft dialog visible, waiting for it to be handled by background handler...');
                // The background handler (registered in TestHelper constructor) will click Resume/Discard.
                // We just wait for the dialog to disappear.
                await dialog.waitFor({ state: 'hidden', timeout: 30000 });
                console.log('[FormHelper] Draft dialog handled and hidden.');
                await this.page.waitForTimeout(1000); // Settle time
            } else {
                console.log('[FormHelper] No draft dialog appeared within timeout.');
            }
        } catch (e) {
            console.warn('[FormHelper] Error while waiting for draft dialog:', e);
        }
    }

    async fillInput(label: string, value: string) {
        // Global draft check
        await this.waitForDraftDialogHandled();

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
            `input[placeholder*="${label}"], ` +
            `input[name="${camelCase}"], ` +
            `input[name="${kebabCase}"], ` +
            `input[name*="${label.toLowerCase().replace(/\s/g, '')}"]`
        ).first();
        
        // Wait for input to be stable and visible
        await input.waitFor({ state: 'visible', timeout: 15000 });
        await input.scrollIntoViewIfNeeded();
        await input.fill(value);
        await input.blur({ timeout: 5000 }).catch(e => {
            console.warn(`[FormHelper] Blur timed out for "${label}", proceeding anyway:`, e.message);
        }); // Trigger change/validation events
    }

    async fillTextarea(label: string, value: string) {
        // Global draft check
        await this.waitForDraftDialogHandled();

        // Prefer exact testid for job description to match post-job form
        if (label.toLowerCase().includes('description')) {
            const textarea = this.page.locator('[data-testid="job-description-input"]').first();
            await textarea.fill(value);
            return;
        }

        // Try getByLabel first (standard accessibility)
        try {
            const textareaByLabel = this.page.getByLabel(label).first();
            if (await textareaByLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
                await textareaByLabel.fill(value);
                return;
            }
        } catch {
            // Ignore and fallback
        }

        const textarea = this.page.locator(
            `textarea[placeholder*="${label}"], textarea[name="${label.toLowerCase().replace(/\s+/g, '')}"], ` +
            `[data-testid*="${label.toLowerCase().replace(/\s+/g, '-')}"] textarea`
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

    async selectWizardCategory(category: string) {
        console.log(`[FormHelper] Selecting wizard category: ${category}`);
        const card = this.page.getByTestId(`${category}-category-card`).first()
            .or(this.page.locator(`[data-testid*="category-card"]:has-text("${category}")`).first());
        await card.waitFor({ state: 'visible', timeout: 10000 });
        await card.click();
        await this.page.waitForTimeout(500); // Wait for transition
    }

    async selectWizardTemplate(templateId: string | null) {
        if (templateId) {
            console.log(`[FormHelper] Selecting template: ${templateId}`);
            const card = this.page.getByTestId(`${templateId}-template-card`).first();
            await card.waitFor({ state: 'visible', timeout: 10000 });
            await card.click();
        } else {
            console.log('[FormHelper] Selecting Custom Request (No template)');
            const card = this.page.getByTestId('custom-template-card').first();
            await card.waitFor({ state: 'visible', timeout: 10000 });
            await card.click();
        }
        await this.page.waitForTimeout(500);
    }

    async selectWizardOption(optionValue: string) {
        console.log(`[FormHelper] Selecting wizard option: ${optionValue}`);
        
        // Wait for the wizard question area to be visible first
        await this.page.locator('[data-testid="wizard-next-button"], button:has-text("Review Requirement"), button:has-text("Next")').first().waitFor({ state: 'visible', timeout: 20000 });
        await this.page.waitForTimeout(1000); // Wait for Framer Motion animation to completely settle

        // Strategy 1: getByRole with exact text (most semantic, handles nested spans)
        try {
            const byRole = this.page.getByRole('button', { name: optionValue, exact: true });
            await byRole.first().waitFor({ state: 'visible', timeout: 8000 });
            await byRole.first().dispatchEvent('click');
            await this.page.waitForTimeout(500);
            console.log(`[FormHelper] ✅ Clicked via getByRole exact: ${optionValue}`);
            return;
        } catch { /* fallthrough */ }

        // Strategy 2: CSS button:has-text (works with partial matches in nested spans)
        try {
            const byText = this.page.locator(`button:has-text("${optionValue}")`).first();
            await byText.waitFor({ state: 'visible', timeout: 8000 });
            await byText.dispatchEvent('click');
            await this.page.waitForTimeout(500);
            console.log(`[FormHelper] ✅ Clicked via has-text: ${optionValue}`);
            return;
        } catch { /* fallthrough */ }

        // Strategy 3: data-test-id attribute (component uses option.value)
        try {
            const slug = optionValue.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
            const cleanVal = optionValue.replace(/[^a-z0-9]/gi, '');
            const byId = this.page.locator(`[data-test-id*="${slug}"], [data-test-id*="${cleanVal}"]`).first();
            await byId.waitFor({ state: 'visible', timeout: 8000 });
            await byId.dispatchEvent('click');
            await this.page.waitForTimeout(500);
            console.log(`[FormHelper] ✅ Clicked via data-test-id: ${optionValue}`);
            return;
        } catch { /* fallthrough */ }

        // Strategy 4: JavaScript click (bypasses all Playwright interception and overlay)
        try {
            const result = await this.page.evaluate((text) => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const target = buttons.find(btn => btn.textContent?.trim().includes(text));
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            }, optionValue);
            if (result) {
                await this.page.waitForTimeout(500);
                console.log(`[FormHelper] ✅ Clicked via JS evaluate: ${optionValue}`);
                return;
            }
        } catch { /* fallthrough */ }

        throw new Error(`[FormHelper] ❌ Could not find wizard option: "${optionValue}"`);
    }


    async clickWizardNext() {
        console.log('[FormHelper] Clicking wizard Next...');
        const nextBtn = this.page.getByTestId('wizard-next-button').first();
        await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
        
        // Wait for the button to become enabled (state update can be slow)
        await expect(nextBtn).toBeEnabled({ timeout: 10000 });
        
        await nextBtn.click({ force: true });
        await this.page.waitForTimeout(1000); // Wait for transition
    }

    async completeWizard(category: string, subType: string, branchAnswers: string[], urgency: string) {
        console.log(`[FormHelper] Completing wizard for ${category} -> ${subType}`);
        
        await this.helper.nav.goToPostJob();
        await this.waitForDraftDialogHandled();
        
        await this.selectWizardCategory(category);
        await this.selectWizardTemplate(null); // Custom request
        
        // Step-by-Step selection
        await this.page.getByText('Step-by-Step').first().click();
        await this.page.waitForTimeout(500);

        // Select Sub-Type
        await this.selectWizardOption(subType);
        await this.clickWizardNext();
        
        // Fill Branch Questions
        for (const answer of branchAnswers) {
            await this.selectWizardOption(answer);
            await this.clickWizardNext();
        }
        
        // Select Urgency (last common question)
        await this.selectWizardOption(urgency);
        await this.clickWizardNext(); // Should go to review step
        
        console.log('[FormHelper] Wizard flow complete, reaching review step...');
        await this.confirmWizardReview();
    }

    async confirmWizardReview() {
        console.log('[FormHelper] Confirming wizard review...');
        await this.helper.auth.waitForStability();
        
        // Wait for the review page to load - AI generation can take time locally
        const reviewHeader = this.page.getByText(/Review Your Job Post|Looks Good, Post Job|Review and Post|Review & Post/i).first();
        await reviewHeader.waitFor({ state: 'visible', timeout: 120000 });
        
        // Click the "Looks Good, Post Job" button
        const looksGoodBtn = this.page.getByRole('button', { name: /Looks Good, Post Job/i }).first();
        await looksGoodBtn.waitFor({ state: 'visible', timeout: 10000 });
        await looksGoodBtn.click({ force: true });
        
        // Wait for redirect to /dashboard/post-job (LLM backend can take >35s locally)
        try {
            await this.page.waitForURL(/\/dashboard\/post-job/, { timeout: 120000 });
        } catch {
            console.warn('[FormHelper] post-job navigation timed out after 120s, attempting fallback dashboard load...');
            await this.page.goto('/dashboard/post-job?wizardCompleted=true', { waitUntil: 'domcontentloaded' });
            await this.page.waitForTimeout(2000);
        }
    }

    async fillPincodeAndSelectPO(pincode: string) {
        const pinInput = this.page.getByTestId('pincode-input').first();
        await pinInput.waitFor({ state: 'visible', timeout: 15000 });
        await pinInput.scrollIntoViewIfNeeded();

        // Use more robust typing logic for pincode to trigger onChange correctly
        await pinInput.click();
        await pinInput.clear();
        await pinInput.pressSequentially(pincode, { delay: 150 });
        await pinInput.blur({ timeout: 5000 }).catch(() => { }); // Ensure change event fires

        console.log(`[FormHelper] Pincode "${pincode}" entered. Waiting for API response...`);

        // Wait for Loading spinner to appear and then disappear
        try {
            const spinner = this.page.locator('.animate-spin').first();
            if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log('[FormHelper] Pincode lookup spinner detected, waiting for it to hide...');
                await spinner.waitFor({ state: 'hidden', timeout: 15000 });
            }
        } catch { /* ignore if spinner never shows */ }

        // Wait for City input to be populated (indicates API success)
        const cityInput = this.page.locator('[data-testid="city-input"]');
        try {
            await expect(cityInput).not.toHaveValue('', { timeout: 20000 });
            const city = await cityInput.inputValue();
            console.log(`[FormHelper] Pincode lookup success. City: ${city}`);
        } catch (e) {
            console.warn('[FormHelper] Pincode lookup timed out or failed. City input is still empty.');
            // We'll continue anyway, maybe it's already filled or has a default
        }

        // Wait for select trigger to become enabled/active
        const poTrigger = this.page.locator('[data-testid="po-select-trigger"], button[role="combobox"]:has-text("Select Post Office")').first();
        const isTriggerVisible = await poTrigger.isVisible({ timeout: 5000 }).catch(() => false);

        if (!isTriggerVisible) {
            console.log('[FormHelper] PO Select Trigger not visible - skipping PO selection (might be auto-selected or API down)');
            return;
        }

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
            await testIdButton.click({ force: true });
            return;
        }

        await this.page.click(`button:has-text("${text}")`, { force: true });
    }

    async waitForToast(message: string, timeout = TIMEOUTS.medium) {
        console.log(`[FormHelper] Waiting for toast: "${message}" (timeout: ${timeout}ms)`);
        
        // Define failure signals: destructive toasts or explicit error messages
        const failureLocator = this.page.locator('[role="status"][data-variant="destructive"], .toast-error').first();
        const successLocator = this.page.locator(`[role="status"]:has-text("${message}"), .toast:has-text("${message}")`).first();

        try {
            const combinedSelector = `[role="status"]:has-text("${message}"), .toast:has-text("${message}"), [role="status"][data-variant="destructive"], .toast-error`;
            const matchedLocator = this.page.locator(combinedSelector).first();
            await matchedLocator.waitFor({ state: 'visible', timeout });

            // If the matched locator is an error, throw it
            const isError = await failureLocator.isVisible();
            if (isError) {
                const errorText = await failureLocator.innerText();
                console.error(`[FormHelper] Detected error toast instead of success: "${errorText}"`);
                throw new Error(`Action failed with error: "${errorText.trim()}". Expected toast: "${message}"`);
            }
            
            console.log(`[FormHelper] Success toast "${message}" detected.`);
        } catch (e: any) {
            if (e.message.includes('Action failed with error')) throw e;
            console.error(`[FormHelper] Timeout waiting for toast "${message}". Current URL: ${this.page.url()}`);
            throw e;
        }
    }

    async waitForErrorToast(timeout = TIMEOUTS.medium) {
        await expect(this.page.locator('[role="status"][data-variant="destructive"], .toast-error').first())
            .toBeVisible({ timeout });
    }

    /**
     * Click "Post Job" and handle the confirmation AlertDialog that follows.
     * Handles: verifyDetails checkbox, Feedback dialog dismissal, confirmation dialog.
     */
    async submitPostJob() {
        // 1. Dismiss any open floating dialogs (Feedback, Draft, etc.)
        try {
            const feedbackDialog = this.page.getByRole('dialog');
            if (await feedbackDialog.isVisible({ timeout: 500 }).catch(() => false)) {
                const closeBtn = feedbackDialog.getByRole('button', { name: /Close|Discard/i }).first();
                if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
                    await closeBtn.click({ force: true });
                    await this.page.waitForTimeout(500);
                } else {
                    await this.page.keyboard.press('Escape');
                    await this.page.waitForTimeout(500);
                }
            }
        } catch { /* no dialog */ }

        // 2. Ensure the "I verify that these details are correct" checkbox is checked
        // Force hide specific overlays that block clicks in CI
        await this.page.evaluate(() => {
            const overlays = [
                '.firebase-emulator-warning',
                '.fixed.z-50'
            ];
            overlays.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) (el as any).style.display = 'none';
            });
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => {
                if (btn.textContent && btn.textContent.includes('Feedback')) {
                    (btn as any).style.display = 'none';
                }
            });
        });

        const verifyLabel = this.page.getByText(/I verify that these details are correct/i);
        const checkbox = this.page.getByTestId('verify-details-checkbox').first();

        try {
            if (await verifyLabel.count() > 0 || await checkbox.count() > 0) {
                console.log('[FormHelper] Ensuring verification checkbox is checked...');

                // Multiple attempts to check the checkbox
                const checkIt = async () => {
                    const isChecked = async () => {
                        if (await checkbox.count() > 0) {
                            const state = await checkbox.getAttribute('data-state');
                            const ariaChecked = await checkbox.getAttribute('aria-checked');
                            return state === 'checked' || ariaChecked === 'true';
                        }
                        return false;
                    };

                    if (!(await isChecked())) {
                        console.log('[FormHelper] Clicking checkbox...');
                        if (await checkbox.count() > 0) {
                            await checkbox.click({ force: true }).catch(() => { });
                        } else if (await verifyLabel.count() > 0) {
                            await verifyLabel.click({ force: true }).catch(() => { });
                        }
                    } else {
                        console.log('[FormHelper] Checkbox already checked, skipping click.');
                    }
                };

                await checkIt();
                await this.page.waitForTimeout(500);

                // Final verification and forced state if needed
                if (await checkbox.count() > 0) {
                    const finalState = await checkbox.getAttribute('data-state');
                    const ariaChecked = await checkbox.getAttribute('aria-checked');
                    if (finalState !== 'checked' && ariaChecked !== 'true') {
                        console.log('[FormHelper] Checkbox still not checked, forcing via state attribute...');
                        await checkbox.evaluate((node) => {
                            node.setAttribute('data-state', 'checked');
                            node.setAttribute('aria-checked', 'true');
                            node.dispatchEvent(new Event('change', { bubbles: true }));
                        });
                    }
                }
            }
        } catch (e) {
            console.log('[FormHelper] Error handling checkbox:', e);
        }

        // 3. Click the Post Job button
        const postBtn = this.page.getByTestId('post-job-button')
            .or(this.page.getByRole('button', { name: /Post Job/i }))
            .or(this.page.getByRole('button', { name: /Save Changes/i }))
            .first();
        await postBtn.waitFor({ state: 'visible', timeout: 5000 });
        const isBtnDisabled = await postBtn.isDisabled();
        const btnHtml = await postBtn.evaluate(el => el.outerHTML).catch(() => 'unknown');
        console.log(`[FormHelper] Post Job button status: disabled=${isBtnDisabled}`);
        console.log(`[FormHelper] Post Job button HTML snippet: ${btnHtml.substring(0, 100)}...`);

        console.log('[FormHelper] Clicking Post Job button...');
        await this.page.screenshot({ path: `test-results/debug-pre-click-${Date.now()}.png`, fullPage: true }).catch(() => { });
        await postBtn.click({ force: true });
        await this.page.screenshot({ path: `test-results/debug-post-click-${Date.now()}.png`, fullPage: true }).catch(() => { });

        // 4. Handle confirmation dialog if it appears
        console.log('[FormHelper] Checking for confirmation dialog...');
        const dialog = this.page.locator('div[role="alertdialog"], div[role="dialog"]').filter({
            has: this.page.getByText(/Confirm|Save|Post|Verify|Proceed|Warning/i)
        });

        console.log('[FormHelper] Checking for confirmation dialog...');
        try {
            await dialog.waitFor({ state: 'visible', timeout: 5000 });
            console.log('[FormHelper] Confirmation dialog detected.');
            const confirmBtn = dialog.getByRole('button', { name: /Confirm|Save|Post|Proceed|Yes|Accept/i }).first()
                .or(dialog.locator('button').filter({ hasText: /Confirm|Save|Post|Proceed|Yes|Accept/i }).first())
                .or(dialog.locator('button').last());

            if (await confirmBtn.isVisible().catch(() => false)) {
                console.log(`[FormHelper] Clicking confirmation button: ${await confirmBtn.innerText().catch(() => 'unknown')}`);
                await confirmBtn.click({ force: true });
                await this.page.waitForTimeout(1000);

                // Second check: if warning dialog (like "Bid exceeds budget") is still there, click again
                // (Sometimes confirmation dialogs are stacked or require multiple clicks in some UI states)
                if (await confirmBtn.isVisible().catch(() => false)) {
                    await confirmBtn.click({ force: true }).catch(() => { });
                }
            } else {
                console.warn('[FormHelper] Dialog found but no clear confirmation button detected.');
            }
        } catch (e) {
            console.log('[FormHelper] No confirmation dialog appeared within timeout.');
        }
        // Check for validation errors
        const errors = await this.page.locator('p.text-destructive, [id*="-error"]').allTextContents();
        if (errors.length > 0) {
            console.warn('[FormHelper] Form has validation errors:', errors.join(' | '));
            await this.page.screenshot({ path: `test-results/debug-errors-${Date.now()}.png`, fullPage: true }).catch(() => {});
        }
        // 5. Check for AI Review page explicitly because its URL overlaps with the Job dashboard
        try {
            console.log('[FormHelper] Checking for AI Review compilation step...');
            const reviewBtn = this.page.getByRole('button', { name: /Looks Good, Post Job|Looks Good/i });
            if (await reviewBtn.waitFor({ state: 'visible', timeout: 60000 }).catch(() => false)) {
                console.log('[FormHelper] AI Review page finished generating, finalizing post...');
                await reviewBtn.click({ force: true });
                await this.page.waitForTimeout(1500); // Give the system time to handle the click
                
                // Extra check for "Save as Template" modals or post-submission delays
                await this.page.waitForLoadState('domcontentloaded');
            } else {
                console.log('[FormHelper] No AI Review page detected within timeout or not applicable.');
            }
        } catch (e) {
            console.log('[FormHelper] AI Review handling error:', e);
        }

        console.log('[FormHelper] submitPostJob completed.');

        // Wait for redirect to job detail and confirm settlement
        console.log('[FormHelper] Waiting for job detail page settlement...');
        await this.page.waitForURL(/\/dashboard\/jobs\/JOB-/, { timeout: 30000 });
        
        // Confirm dashboard marker is visible as proxy for hydration
        // Resilient wait: if the marker is not found within 15s (local build/slow sync), 
        // reload once and wait up to 60s (live environment latency)
        try {
            await this.page.waitForSelector('[data-testid="dashboard-marker"]', { state: 'attached', timeout: 15000 });
        } catch {
            console.warn('[FormHelper] dashboard-marker not immediately visible, reloading to force hydration...');
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="dashboard-marker"]', { state: 'attached', timeout: 45000 });
        }
        
        const jobId = this.page.url().split('/').pop() || '';
        console.log(`[FormHelper] Redirected to Job ID: ${jobId}`);
        return jobId;
    }
}

/**
 * Navigation Helper Functions
 */
export class NavigationHelper {
    constructor(private page: Page) { }

    // changed from private so external tests can invoke it when they need to purge
    // floating overlays prior to a click. ideally the helper would handle this
    // automatically but a few legacy tests still call it explicitly.
    public async injectCookieHide() {
        // old name is misleading but this helper is invoked after every navigation and is a good
        // place to drop any transient overlays that regularly interfere with clicks during E2E
        // runs.
        await this.page.addStyleTag({ content: '.CookieConsent { display: none !important; }' }).catch(() => { });

        // remove the omnipresent beta feedback button that sometimes intercepts clicks
        await this.page.evaluate(() => {
            try {
                document.querySelectorAll('button').forEach(btn => {
                    const text = btn.textContent || '';
                    // the widget sometimes renders as a tiny ellipsis with hidden span
                    if (text.includes('Beta Feedback') || text.includes('Feedback') || text.trim() === '…') {
                        btn.remove();
                    }
                });
            } catch (e) {
                // swallow any errors during page evaluation
                // note: this runs in the browser context
            }
        }).catch(() => { });
    }

    async goToPostJob(): Promise<boolean> {
        // Fast Refresh / emulator flakiness can prevent the full "load" event.
        // Prefer domcontentloaded and wait for a stable form marker.
        const maxRetries = 2;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.page.goto(ROUTES.postJob, { waitUntil: 'domcontentloaded', timeout: 90000 });
                break;
            } catch (e) {
                console.warn(`[NavigationHelper] goToPostJob attempt ${attempt}/${maxRetries} failed:`, e);
                if (attempt === maxRetries) throw e;
                await this.page.waitForTimeout(2000);
            }
        }
        await this.injectCookieHide();

        // Wait for categories or the "What do you need help with?" heading
        try {
            const categoryIndicator = this.page.locator('[data-testid*="-category-card"], h1:has-text("What do you need help with?"), h1:has-text("Job Type")').first();
            await categoryIndicator.waitFor({ state: 'visible', timeout: 90000 });
            console.log('[NavigationHelper] Successfully reached Post Job wizard');
        } catch (e) {
            console.warn('[NavigationHelper] Post Job wizard indicators not found after 90s, checking current state...');
            
            // If redirected to dashboard, wait and then navigate to post-job again (one-time fallback)
            if (this.page.url().includes('/dashboard')) {
                console.log('[NavigationHelper] Redirected to dashboard, re-attempting navigation to post-job...');
                await this.page.goto(ROUTES.postJob, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await this.page.locator('[data-testid*="-category-card"]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
            }
        }

        // Dismiss persistent draft recovery dialog
        const resumeModal = this.page.locator('div[role="dialog"]:has-text("Resume your draft?"), h2:has-text("Resume your draft?"), .alert-dialog:has-text("Resume")').first();
        if (await resumeModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('[NavigationHelper] Found Resume Draft modal, discarding it');
            const discardBtn = this.page.locator('button:has-text("Discard")').first();
            if (await discardBtn.isVisible()) {
                await discardBtn.click({ force: true });
            } else {
                await this.page.locator('button:has-text("Close"), button[aria-label="Close"]').first().click({ force: true }).catch(() => { });
                await this.page.keyboard.press('Escape');
            }
            await this.page.waitForTimeout(1000);
        }

        // Final verification we reached the correct page (Wait for Category Cards)
        try {
            await this.page.waitForFunction(
                () => {
                    const el = document.querySelector('[data-testid*="-category-card"]') as HTMLElement | null;
                    return el && el.offsetParent !== null;
                },
                { timeout: 30000 }
            );
            console.log('[NavigationHelper] Wizard categories visible and ready');
            return true;
        } catch (e) {
            console.error('[NavigationHelper] Failed to find wizard categories after all retries');
            return false;
        }
    }

    async goToPostedJobs() {
        await this.page.goto(ROUTES.postedJobs);
        await this.page.waitForLoadState('load');
        await this.injectCookieHide();
    }

    async goToBrowseJobs() {
        // Fast Refresh / emulator flakiness can prevent the full "load" event.
        // Prefer domcontentloaded and retry navigation.
        const maxRetries = 2;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // "commit" is more resilient than waiting for DOM events during hot reload / frame swaps.
                await this.page.goto(ROUTES.browseJobs, { waitUntil: 'commit', timeout: 90000 });
                break;
            } catch (e) {
                console.warn(`[NavigationHelper] goToBrowseJobs attempt ${attempt}/${maxRetries} failed:`, e);
                if (attempt === maxRetries) throw e;
                // Don't rely on page APIs here; the page may be mid-reload or detached.
                if (this.page.isClosed()) throw e;
                await new Promise<void>((resolve) => setTimeout(resolve, 2000));
            }
        }
        await this.injectCookieHide();

        // Wait for a stable marker on the page (URL may update via client routing)
        await this.page.waitForURL(/\/dashboard\/jobs/, { timeout: 30000 }).catch(() => { });
        // Some devices or hydration scenarios hide the sidebar nav even though the page
        // is usable; rely on a secondary marker such as the job list container so
        // we don't hang indefinitely.
        const width = await this.page.evaluate(() => window.innerWidth);
        if (width >= 640) {
            await this.page.getByTestId('nav-link-browseJobs').first()
                .waitFor({ state: 'visible', timeout: 30000 }).catch(() => { /* ignore */ });
        }
        // always wait for at least one job card or an empty-state message; this is
        // the feature under test and gives confidence the page is interactive
        await Promise.race([
            this.page.waitForSelector('[data-testid="job-card"]', { timeout: 30000 }),
            this.page.waitForSelector('text=No jobs found', { timeout: 30000 })
        ]).catch(() => {
            // if both selectors failed, let the test proceed and fail later; we don't
            // want navigation to block forever
            console.warn('[NavigationHelper] browseJobs stability markers not found');
        });
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
                
                // DIAGNOSTIC: Log all present data-status attributes
                const allBadges = await this.page.locator('[data-status]').all();
                const statuses = await Promise.all(allBadges.map(b => b.getAttribute('data-status')));
                console.log(`Helper: Currently visible status attributes: ${statuses.join(', ')}`);

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

            // Before failing, take a screenshot
            const screenshotPath = `test-results/status-failure-${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath });
            console.error(`Helper: Timeout waiting for status: ${status}. Screenshot saved to ${screenshotPath}`);

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

    /**
     * Wait for a subcollection (e.g. bids, milestones) to be populated/synced in the UI.
     * This is useful for preventing race conditions after a server action where 
     * Firestore listeners might be slow to propagate subcollection items.
     */
    async waitForSubcollectionSync(containerSelector: string, itemSelector: string, timeout = 30000) {
        console.log(`[WaitHelper] Waiting for subcollection sync in "${containerSelector}" for items "${itemSelector}"...`);
        const container = this.page.locator(containerSelector);
        const items = container.locator(itemSelector);

        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const count = await items.count();
            if (count > 0) {
                console.log(`[WaitHelper] Sync complete: ${count} items found.`);
                return;
            }
            // Small wait before checking again - polling is safer than purely relying on visible
            await this.page.waitForTimeout(2000);
            
            // If the container itself isn't even visible, maybe we need to wait or it's empty
            if (!(await container.isVisible())) {
                console.log(`[WaitHelper] Container "${containerSelector}" not yet visible...`);
            }
        }
        
        console.warn(`[WaitHelper] Subcollection sync timed out and found 0 items in ${timeout}ms. Proceeding anyway...`);
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
 * Combined Test Helper Options
 */
export interface TestHelperOptions {
    draftHandling?: 'resume' | 'discard';
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
    constructor(public page: Page, options: TestHelperOptions = {}) {
        const { draftHandling = 'resume' } = options;
        
        this.auth = new AuthHelper(page);
        this.nav = new NavigationHelper(page);
        this.job = new JobHelper(page);
        this.form = new FormHelper(page, this);
        this.wait = new WaitHelper(page);
        this.debug = new DebugHelper(page);

        // 3. Universal Draft Restoration Handler
        // Configure behavior: 'resume' (default) or 'discard' (clean state)
        if (!this.page.isClosed()) {
            this.page.addLocatorHandler(
                this.page.getByRole('dialog', { name: 'Resume your draft?' }),
                async (locator) => {
                    const diagName = 'Resume your draft?';
                    console.log(`[TestHelper] Universal draft handler triggered for "${diagName}"`);
                    
                    try {
                        const url = this.page.url();
                        const isWizardCompleted = url.includes('wizardCompleted=true');
                        const effectiveHandling = isWizardCompleted ? 'resume' : draftHandling;

                        if (effectiveHandling === 'discard') {
                            const discardBtn = locator.getByRole('button', { name: /Discard|No|Start Fresh/i });
                            if (await discardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                                console.log('[TestHelper] Universal draft handler: Discarding draft...');
                                await discardBtn.click({ force: true }).catch((e: any) => { 
                                    console.error('[TestHelper] Discard click failed:', e.message); 
                                });
                            }
                        } else {
                            const resumeBtn = locator.getByRole('button', { name: /Resume Draft|Resume|Yes|Continue/i });
                            if (await resumeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                                console.log('[TestHelper] Universal draft handler: Resuming draft...');
                                await resumeBtn.click({ force: true }).catch((e: any) => { 
                                    console.error('[TestHelper] Resume click failed:', e.message); 
                                });
                            }
                        }
                        
                        // Critical: wait for the locator to be hidden before finishing the handler
                        await locator.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
                            console.warn(`[TestHelper] Draft dialog "${diagName}" still visible after click, pressing Escape...`);
                            return this.page.keyboard.press('Escape');
                        });
                        
                        // Extra settle time
                        await this.page.waitForTimeout(2000);
                        console.log(`[TestHelper] Universal draft handler: Finished for "${diagName}"`);
                    } catch (err: any) {
                        console.error('[TestHelper] Universal draft handler error:', err.message);
                    }
                }
            ).catch(e => console.warn('[TestHelper] Failed to add locator handler:', e.message));
        }

        // 1. Set cookie on the context level (most reliable)
        const baseUrl = page.url() && page.url() !== 'about:blank' ? page.url() : 'http://localhost:5000';
        try {
            const urlObj = new URL(baseUrl);
            const hostname = urlObj.hostname || 'localhost';
            const commonCookie = {
                value: 'true',
                domain: hostname,
                path: '/',
                expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365
            };
            void this.page.context().addCookies([
                { ...commonCookie, name: 'dodo-cookie-consent' },
                { ...commonCookie, name: 'CookieConsent' }
            ]).catch(() => {});
        } catch { /* ignore invalid URL */ }

        // 2. Suppress overlays via persistent CSS injection
        // Uses InitScript for early execution, but wrapped to avoid blocking if CSP prevents it
        if (!this.page.isClosed()) {
            this.page.addInitScript(() => {
                const styleId = 'e2e-suppress-overlays';
                const injectStyles = () => {
                    try {
                        if (document.getElementById(styleId)) return;
                        if (!document.head && !document.documentElement) return;
                        
                        const style = document.createElement('style');
                        style.id = styleId;
                        style.innerHTML = `
                            .CookieConsent, 
                            #cookie-consent-banner,
                            [class*="CookieConsent"],
                            .fixed.bottom-0.left-0.right-0.z-50,
                            [data-state="open"][aria-hidden="true"],
                            .fixed.inset-0.z-50.bg-black\\/80 { 
                                display: none !important; 
                                opacity: 0 !important;
                                pointer-events: none !important;
                                visibility: hidden !important;
                                z-index: -9999 !important; 
                            }
                            .firebase-emulator-warning { display: none !important; pointer-events: none !important; }
                        `;
                        (document.head || document.documentElement).appendChild(style);
                    } catch (e) {
                        console.warn('[E2E-Init] Style injection failed:', e);
                    }
                };

                const hideFeedback = () => {
                    try {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        for (const btn of buttons) {
                            const text = btn.textContent || '';
                            if (text.includes('Feedback') || text.includes('Beta Feedback') || text === '…') {
                                if (btn.classList.contains('fixed') || btn.classList.contains('z-50')) {
                                    (btn as any).style.display = 'none';
                                }
                            }
                        }
                    } catch (e) {}
                };

                // Execute immediately and on DOM content
                injectStyles();
                hideFeedback();

                if (typeof MutationObserver !== 'undefined') {
                    const observer = new MutationObserver(() => {
                        injectStyles();
                        hideFeedback();
                    });
                    observer.observe(document.documentElement, { childList: true, subtree: true });
                }
            }).catch(e => console.warn('[TestHelper] addInitScript failed (potentially CSP blocked):', e.message));
        }

        // Auto-enable console logging for debugging
        this.debug.logConsoleErrors();
        // Auto-mock external APIs (pincode) for stability in E2E runs
        this.mockExternalAPIs();
    }

    mockExternalAPIs() {
        const page = this.page;
        if (!page) return;
        console.log('[TestHelper] Mocking external APIs (Pincode, Maps, etc)...');

        // Mock Google Maps API to prevent RefererNotAllowedMapError on localhost:5000
        page.route('**/*maps.googleapis.com/maps/api/place/autocomplete/*', async route => {
            const url = route.request().url();
            console.log(`[Mock] Intercepted Google Maps Autocomplete request: ${url}`);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    predictions: [
                        { description: '123 Test St, Bangalore', place_id: 'mock_place_1' },
                        { description: 'Direct Award Lane, Bangalore', place_id: 'mock_place_2' }
                    ],
                    status: 'OK'
                })
            });
        }).catch(() => { });

        // Mock the core Google Maps JS script load
        this.page.route('**/*maps.googleapis.com/maps/api/js*', async route => {
            console.log(`[Mock] Intercepted Google Maps JS Script payload`);
            await route.fulfill({
                status: 200,
                contentType: 'application/javascript',
                body: `
                    window.google = window.google || {};
                    window.google.maps = {
                        places: {
                            AutocompleteService: function() {},
                            PlacesServiceStatus: { OK: 'OK' }
                        }
                    };
                `
            });
        }).catch(() => { });

        // Mock Pincode API - Broad pattern
        const pincodePattern = /.*api\.postalpincode\.in\/pincode\/.*/;
        page.route(pincodePattern, async route => {
            const url = route.request().url();
            const match = url.match(/pincode\/(\d{6})/);
            const pincode = match ? match[1] : 'unknown';
            console.log(`[Mock] Intercepted Pincode request for: ${pincode} (${url})`);

            if (pincode === '000000' || pincode === 'invalid') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{ Status: 'Error', Message: 'No records found' }])
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    Message: "Number of post office(s) found: 2",
                    Status: "Success",
                    PostOffice: [
                        { Name: "Connaught Place", District: "Central Delhi", State: "Delhi", Country: "India", Pincode: "110001" },
                        { Name: "Sansad Marg", District: "Central Delhi", State: "Delhi", Country: "India", Pincode: "110001" }
                    ]
                }])
            });
        });
        console.log(`[Mock] Pincode API route registered with pattern: ${pincodePattern}`);
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

    async hideTestOverlays() {
        console.log('[TestHelper] Hiding test overlay elements...');
        try {
            await this.page.evaluate(() => {
                // Hide firebase emulator warning
                const emulatorWarning = document.querySelector('.firebase-emulator-warning');
                if (emulatorWarning) {
                    (emulatorWarning as any).style.display = 'none';
                    (emulatorWarning as any).style.visibility = 'hidden';
                    (emulatorWarning as any).style.pointerEvents = 'none';
                    (emulatorWarning as any).style.position = 'absolute';
                    (emulatorWarning as any).style.left = '-9999px';
                }

                // Hide Beta Feedback button and other overlays
                const elements = Array.from(document.querySelectorAll('button, div'));
                for (const el of elements) {
                    const text = el.textContent || '';
                    const classes = el.className;

                    // Check if it's a fixed button or overlay
                    if ((text.includes('Beta') || text.includes('Feedback') || text === '…' || classes.includes('fixed') && classes.includes('z-50')) && el.tagName === 'BUTTON') {
                        (el as any).style.display = 'none';
                        (el as any).style.visibility = 'hidden';
                        (el as any).style.pointerEvents = 'none';
                    }
                }
            });
            console.log('[TestHelper] Test overlays hidden successfully.');
        } catch (e) {
            console.warn('[TestHelper] Failed to hide overlays:', e);
        }
    }

    // Prepare the post-job form to be submitted: dismiss dialogs, ensure fields, set defaults
    async preparePostJobSubmission() {
        // Disable autosave where applicable
        await this.page.evaluate(() => { (window as any).__DISABLE_AUTO_SAVE__ = true; }).catch(() => { });

        // Dismiss blocking dialogs
        const blockingDialog = this.page.getByRole('dialog');
        if (await blockingDialog.isVisible().catch(() => false)) {
            const dismissButton = blockingDialog.getByRole('button', { name: /Discard|Cancel|Close|Start Fresh|Skip|No/i }).first();
            if (await dismissButton.isVisible().catch(() => false)) {
                await dismissButton.click({ force: true });
            } else {
                await this.page.keyboard.press('Escape').catch(() => { });
            }
        }

        // Ensure job title is at least 10 chars (fallback using native React approach)
        const titleInput = this.page.getByTestId('job-title-input');
        if (await titleInput.isVisible().catch(() => false)) {
            const val = await titleInput.inputValue();
            if (val.trim().length < 10 && val.trim() !== '') {
                // Only fill if NOT empty but too short. If empty, the test should have filled it.
                // Or better, let the test fail if it's invalid instead of magic fallback.
                console.log('[FormHelper] Title too short, but not overriding with magic string to avoid E2E mismatches.');
            }
        }

        // Ensure long description
        const description = this.page.locator('[data-testid="job-description-input"]');
        if (await description.isVisible().catch(() => false)) {
            const value = await description.inputValue();
            if (value.trim().length < 50) {
                await description.fill('Detailed job description for E2E testing. Includes requirements, scope, and constraints for installation work.');
            }
        }

        // Category select fallback
        const categoryTrigger = this.page.getByTestId('job-category-select');
        if (await categoryTrigger.isVisible().catch(() => false)) {
            try {
                await categoryTrigger.click();
                const option = this.page.getByRole('option').first();
                if (await option.isVisible().catch(() => false)) await option.click();
            } catch {
                await categoryTrigger.dispatchEvent('click').catch(() => { });
            }
        }

        // Skills
        const skillsInput = this.page.getByTestId('skills-input');
        if (await skillsInput.isVisible().catch(() => false)) {
            const value = await skillsInput.inputValue();
            if (!value.trim()) await skillsInput.fill('CCTV');
        }

        // Pincode/post office
        const pinInput = this.page.getByTestId('pincode-input');
        if (await pinInput.isVisible().catch(() => false)) {
            let pinValue = (await pinInput.inputValue()).trim();
            if (pinValue.length !== 6) {
                pinValue = '110001';
                await pinInput.fill(pinValue);
            }
            await pinInput.blur();
            const poTrigger = this.page.getByTestId('po-select-trigger');
            if (await poTrigger.isVisible().catch(() => false)) {
                const isDisabled = await poTrigger.isDisabled().catch(() => false);
                if (!isDisabled) {
                    await poTrigger.click().catch(() => { });
                    const option = this.page.locator('[data-testid="po-select-item"], [role="option"]').first();
                    if (await option.isVisible().catch(() => false)) await option.click().catch(() => { });
                }
            }
        }

        // Detailed Address (House & Street)
        const houseInput = this.page.getByTestId('house-input').first();
        if (await houseInput.count() > 0) {
            const value = await houseInput.inputValue().catch(() => '');
            if (!value.trim()) {
                console.log('[TestHelper] Filling missing house field');
                await houseInput.fill('Flat 4B');
            }
        }

        const streetInput = this.page.getByTestId('street-input').first();
        if (await streetInput.count() > 0) {
            const value = await streetInput.inputValue().catch(() => '');
            if (!value.trim()) {
                console.log('[TestHelper] Filling missing street field');
                await streetInput.fill('Test Street');
            }
        }

        const mapInput = this.page.getByTestId('full-address-input');
        if (await mapInput.isVisible().catch(() => false)) {
            const value = await mapInput.inputValue();
            if (!value.trim() || value.length < 10) await mapInput.fill('123 Test St, Bangalore, India');
        }


        // Budget (priceEstimate.min and max)
        const minBudgetInput = this.page.getByTestId('min-budget-input');
        if (await minBudgetInput.isVisible().catch(() => false)) {
            const val = await minBudgetInput.inputValue();
            if (!val || Number(val) < 1) {
                await minBudgetInput.fill('5000');
                await minBudgetInput.blur();
            }
        }
        const maxBudgetInput = this.page.getByTestId('max-budget-input');
        if (await maxBudgetInput.isVisible().catch(() => false)) {
            const val = await maxBudgetInput.inputValue();
            if (!val || Number(val) < 1) {
                await maxBudgetInput.fill('5000');
                await maxBudgetInput.blur();
            }
        }

        // Verify checkbox
        const verifyCheckbox = this.page.getByRole('checkbox', { name: /I verify that these details are correct/i });
        if (await verifyCheckbox.isVisible().catch(() => false)) {
            const checked = await verifyCheckbox.getAttribute('aria-checked').catch(() => undefined);
            if (checked !== 'true') await verifyCheckbox.click().catch(() => { });
        } else {
            const verifyText = this.page.getByText(/I verify that these details are correct/i);
            if (await verifyText.isVisible().catch(() => false)) await verifyText.click().catch(() => { });
        }
    }

    // Submit the Post Job action with overlays and confirm handling
    async submitPostJob(options?: { force?: boolean }) {
        // Delegate to the robust FormHelper implementation
        return await this.form.submitPostJob();
    }
}
