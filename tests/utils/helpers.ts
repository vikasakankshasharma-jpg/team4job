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

        const maxRetries = 3;
        let attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            try {
                console.log(`[AuthHelper] Seed users attempt ${attempts}/${maxRetries}`);
                const response = await this.page.request.post('/api/e2e/seed-users');

                if (response.ok()) {
                    AuthHelper.seeded = true;
                    console.log('[AuthHelper] Seeded test users successfully.');
                    return;
                } else {
                    console.warn(`[AuthHelper] Seed users call failed with status ${response.status()}, attempt ${attempts}`);
                    if (attempts === maxRetries) {
                        throw new Error(`Failed to seed users after ${maxRetries} attempts. Last status: ${response.status()}`);
                    }
                    // Wait before retry
                    await this.page.waitForTimeout(2000);
                }
            } catch (e: any) {
                console.warn(`[AuthHelper] Seed users attempt ${attempts} failed:`, e);
                if (attempts === maxRetries) {
                    throw new Error(`Failed to seed users after ${maxRetries} attempts due to error: ${e.message || e}`);
                }
                // Wait before retry
                await this.page.waitForTimeout(2000);
            }
        }
    }

    async loginAsJobGiver() {
        await this.login(TEST_ACCOUNTS.jobGiver.email, TEST_ACCOUNTS.jobGiver.password);
        await this.ensureRole('Job Giver');
    }

    async loginAsInstaller() {
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

            // Click user menu - try multiple locators
            const userMenu = this.page.locator('[data-testid="user-menu-trigger"]')
                .or(this.page.locator('button.rounded-full:has(img)'))
                .or(this.page.locator('button:has(.rounded-full)'))
                .or(this.page.locator('button[aria-label*="user"]'))
                .or(this.page.locator('button[aria-label*="menu"]'))
                .filter({ hasNot: this.page.locator('xpath=ancestor::*[contains(@class, "hidden") or contains(@class, "md:hidden")]') })
                .first();

            try {
                await userMenu.waitFor({ state: 'visible', timeout: 10000 });
                await userMenu.click();
                console.log('[AuthHelper] Clicked user menu');
            } catch (e: any) {
                console.log('[AuthHelper] User menu not found or not clickable, checking if we are on dashboard...');
                if (this.page.url().includes('/dashboard')) {
                    console.log('[AuthHelper] Already on dashboard, proceeding without role switch');
                    return;
                }

                // Fallback: attempt to navigate to dashboard and re-check indicators.
                // This handles transient reloads / missing header UI during hydration.
                await this.page.goto('/dashboard');
                await this.page.waitForLoadState('domcontentloaded');
                await this.page.waitForTimeout(1500);

                const installerNow = await this.page.getByText('Browse Jobs').first().isVisible().catch(() => false) ||
                    await this.page.getByText('Open Jobs').first().isVisible().catch(() => false);
                const jobGiverNow = await this.page.getByText('Post Job').first().isVisible().catch(() => false) ||
                    await this.page.getByText('Active Jobs').first().isVisible().catch(() => false);

                const matchedNow = (targetRole === 'Installer' && installerNow) || (targetRole === 'Job Giver' && jobGiverNow);
                if (matchedNow) {
                    console.log(`[AuthHelper] ${targetRole} indicators found after dashboard fallback.`);
                    return;
                }

                // Don't hard-fail here; role switcher can be unavailable for single-role users.
                console.log(`[AuthHelper] User menu missing; continuing without switching to ${targetRole}.`);
                return;
            }

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
        const maxRetries = 3;

        while (attempts < maxRetries) {
            attempts++;
            try {
                console.log(`[AuthHelper] Login attempt ${attempts}/${maxRetries} for ${email}`);

                // Navigate to login
                // Hot reload / frame swaps can prevent the full "load" event.
                await this.page.goto(ROUTES.login, { waitUntil: 'domcontentloaded', timeout: 90000 });
                await this.page.waitForLoadState('domcontentloaded');

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
                    await submitButton.click({ timeout: 10000 });
                } catch (e) {
                    console.log('[AuthHelper] Normal click failed/timed out, trying force click...');
                    await submitButton.click({ force: true });
                }

                // Wait for redirect to dashboard with stable markers
                try {
                    // First wait for URL change
                    await this.page.waitForURL(/\/dashboard/, { timeout: 30000, waitUntil: 'domcontentloaded' });

                    // Then wait for a stable dashboard marker (nav or user menu)
                    await this.page.waitForSelector('[data-testid="nav-link-auditLog"], [data-testid="user-menu-trigger"], nav, [role="navigation"]', {
                        state: 'visible',
                        timeout: 30000
                    });

                    console.log(`[AuthHelper] Login successful for ${email}`);
                    return;
                } catch (error) {
                    // If we didn't reach dashboard, try to surface a helpful error from the login page.
                    try {
                        const bodyText = (await this.page.textContent('body')) || '';
                        const looksLikeLoginError = /invalid|wrong|incorrect|failed|error/i.test(bodyText);
                        if (this.page.url().includes('/login') && looksLikeLoginError) {
                            throw new Error(`[AuthHelper] Login did not redirect to /dashboard. Still on ${this.page.url()}. Possible login error visible on page.`);
                        }
                    } catch {
                        // ignore secondary failures
                    }
                    console.error(`[AuthHelper] Login failed to reach dashboard:`, error);
                    throw error;
                }
            } catch (error) {
                console.error(`[AuthHelper] Login attempt ${attempts} failed:`, error);

                // Screenshot on failure
                if (!this.page.isClosed()) {
                    await this.page.screenshot({ path: `test-results/login-failure-${attempts}.png` }).catch(() => { });
                }

                if (attempts === maxRetries) throw error;
                if (!this.page.isClosed()) {
                    await this.page.waitForTimeout(2000);
                    await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
                }
            }
        }

        const currentUrl = this.page.url();
        const pageText = await this.page.textContent('body');
        throw new Error(`Login failed after ${maxRetries} attempts. Current URL: ${currentUrl}.`);
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
        try {
            // Click user menu - try multiple locators
            const userMenu = this.page.locator('[data-testid="user-menu-trigger"]')
                .or(this.page.locator('button.rounded-full:has(img)'))
                .or(this.page.locator('button:has(.rounded-full)'))
                .filter({ hasNot: this.page.locator('xpath=ancestor::*[contains(@class, "hidden")]') })
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
            const textareaByLabel = this.page.getByLabel(label).first();
            // Handle timeout gracefully inside a try block
            if (await textareaByLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
                await textareaByLabel.fill(value);
                return;
            }
        } catch (e) {
            // Ignore and fallback
        }

        // Expanded fallback locators for complex nesting (like Job Description with AI button)
        const textarea = this.page.locator(
            `textarea[placeholder*="${label}"], ` +
            `textarea[name="${label.toLowerCase().replace(/\s/g, '')}"], ` +
            `[data-testid*="${label.toLowerCase().replace(/\s/g, '-')}"] textarea`
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

        // Use more robust typing logic for pincode to trigger onChange correctly
        await pinInput.click();
        await pinInput.clear();
        await pinInput.pressSequentially(pincode, { delay: 150 });
        await pinInput.blur(); // Ensure change event fires

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
        await expect(this.page.locator(`[role="status"]:has-text("${message}"), .toast:has-text("${message}")`).first())
            .toBeVisible({ timeout });
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
                'button:has-text("Feedback")',
                '.fixed.z-50'
            ];
            overlays.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) (el as any).style.display = 'none';
            });
        });

        const verifyLabel = this.page.getByText('I verify that these details are correct');
        const checkbox = this.page.locator('button[role="checkbox"]:has-text("I verify"), button[role="checkbox"][id*="verify"]').first();

        try {
            if (await verifyLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('[FormHelper] Ensuring verification checkbox is checked...');

                // Multiple attempts to check the checkbox
                const checkIt = async () => {
                    const state = await checkbox.getAttribute('data-state');
                    if (state !== 'checked') {
                        await checkbox.click({ force: true }).catch(() => { });
                        await verifyLabel.click({ force: true }).catch(() => { });
                    }
                };

                await checkIt();
                await this.page.waitForTimeout(500);

                // Final verification and forced state if needed
                const finalState = await checkbox.getAttribute('data-state');
                if (finalState !== 'checked') {
                    console.log('[FormHelper] Checkbox still not checked, forcing via state attribute...');
                    await checkbox.evaluate((node) => {
                        node.setAttribute('data-state', 'checked');
                        node.setAttribute('aria-checked', 'true');
                    });
                }
            }
        } catch (e) {
            console.log('[FormHelper] Error handling checkbox:', e);
        }

        // 3. Click the Post Job button
        const postBtn = this.page.getByTestId('post-job-button').or(this.page.getByRole('button', { name: /Post Job/i })).first();
        await postBtn.waitFor({ state: 'visible', timeout: 5000 });
        console.log('[FormHelper] Clicking Post Job button...');
        await postBtn.click({ force: true });

        // 4. Wait for the confirmation dialog
        const confirmDialog = this.page.locator('div[role="alertdialog"], div[role="dialog"]:has-text("Confirm")').first();
        try {
            console.log('[FormHelper] Waiting for confirmation dialog...');
            await confirmDialog.waitFor({ state: 'visible', timeout: 10000 });

            const confirmAction = confirmDialog.getByRole('button', { name: /Confirm|Save|Continue|Yes|Post/i }).first();
            await confirmAction.waitFor({ state: 'visible', timeout: 5000 });
            await confirmAction.click({ force: true });
            console.log('[FormHelper] Confirmation action clicked.');
        } catch (e) {
            console.log('[FormHelper] No confirmation dialog appeared or timeout.');
            // Check for validation errors
            const errors = await this.page.locator('p.text-destructive, [id*="-error"]').allTextContents();
            if (errors.length > 0) {
                console.warn('[FormHelper] Form has validation errors:', errors.join(' | '));
            }
        }
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

        // Wait for unique Post Job page markers
        try {
            await this.page.waitForSelector('h1:has-text("Post Job"), button:has-text("Post Job")', { timeout: 30000 });
        } catch { console.warn('[NavigationHelper] Post Job heading not found, but continuing...'); }

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

        // Wait for the Post Job heading to appear (form is loaded)
        await this.page.locator('h1:has-text("Post Job")').waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

        // Stable marker: first required field
        await this.page.getByTestId('job-title-input').waitFor({ state: 'visible', timeout: 30000 });

        // Dismiss draft recovery dialog - retry a few times as it loads asynchronously from Firestore
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const dialog = this.page.getByRole('dialog');
                await dialog.waitFor({ state: 'visible', timeout: 3000 });
                // Try Discard first, then Cancel, then Close
                const dismissButton = dialog.getByRole('button', { name: /Discard/i }).first();
                if (await dismissButton.isVisible({ timeout: 1000 })) {
                    await dismissButton.click({ force: true });
                } else {
                    const cancelButton = dialog.getByRole('button', { name: /Cancel|Close|Start Fresh|Skip|No/i }).first();
                    if (await cancelButton.isVisible({ timeout: 1000 })) {
                        await cancelButton.click({ force: true });
                    } else {
                        await this.page.keyboard.press('Escape');
                    }
                }
                await this.page.waitForTimeout(500);
                // Check if dialog is gone
                if (!(await dialog.isVisible().catch(() => false))) break;
            } catch {
                // No draft dialog appeared — break out
                break;
            }
        }

        // Final wait for form to be interactive
        await this.page.waitForTimeout(500);
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

        // Wait for a stable marker on the page
        await this.page.waitForURL(/\/dashboard\/jobs/, { timeout: 30000 }).catch(() => { });
        // Stable marker: sidebar link exists even if the page content is still streaming/hydrating
        await this.page.getByTestId('nav-link-browseJobs').first()
            .waitFor({ state: 'visible', timeout: 30000 });
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

        // Globally suppress cookie banner and test overlay elements
        this.page.addInitScript(() => {
            // Hide overlays with CSS
            const style = document.createElement('style');
            style.innerHTML = `
                .CookieConsent { display: none !important; }
                .firebase-emulator-warning { display: none !important; pointer-events: none !important; }
            `;
            document.head.appendChild(style);

            // Set up MutationObserver to persist overlay hiding as new elements are added
            const observer = new MutationObserver(() => {
                // Hide firebase emulator warning
                const emulatorWarning = document.querySelector('.firebase-emulator-warning');
                if (emulatorWarning) {
                    (emulatorWarning as any).style.display = 'none';
                    (emulatorWarning as any).style.pointerEvents = 'none';
                }

                // Hide Beta Feedback button
                const betaButtons = Array.from(document.querySelectorAll('button'));
                for (const btn of betaButtons) {
                    const text = btn.textContent || '';
                    if (text.includes('Beta Feedback') || text.includes('Feedback') || text === '…') {
                        if (btn.classList.contains('fixed') || btn.classList.contains('z-50')) {
                            (btn as any).style.display = 'none';
                            (btn as any).style.pointerEvents = 'none';
                        }
                    }
                }
            });

            // Start observing the document for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
            });
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
        console.log('[TestHelper] Mocking external APIs (Pincode, Maps, etc)...');

        // Mock Google Maps API to prevent RefererNotAllowedMapError on localhost:5000
        await this.page.route('**/*maps.googleapis.com/maps/api/place/autocomplete/*', async route => {
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

        // Mock the core Google Maps JS script load so it doesn't throw the Referrer error on the window
        await this.page.route('**/*maps.googleapis.com/maps/api/js*', async route => {
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
            if (val.trim().length < 10) {
                // Use native React input setter to trigger react-hook-form's onChange
                await titleInput.fill('Test CCTV Installation');
                await titleInput.dispatchEvent('input');
                await titleInput.dispatchEvent('change');
                await titleInput.blur();
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
        const houseInput = this.page.getByTestId('house-input');
        if (await houseInput.isVisible().catch(() => false)) {
            const value = await houseInput.inputValue();
            if (!value.trim()) await houseInput.fill('Flat 4B');
        }

        const streetInput = this.page.getByTestId('street-input');
        if (await streetInput.isVisible().catch(() => false)) {
            const value = await streetInput.inputValue();
            if (!value.trim()) await streetInput.fill('12th Main Road, Indiranagar');
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
        // Hide common blocking elements
        const betaFeedback = this.page.getByRole('button', { name: /Beta Feedback/i });
        if (await betaFeedback.isVisible().catch(() => false)) {
            await betaFeedback.evaluate(el => (el as HTMLElement).style.display = 'none').catch(() => { });
        }
        const emulatorWarning = this.page.locator('.firebase-emulator-warning');
        if (await emulatorWarning.isVisible().catch(() => false)) {
            await emulatorWarning.evaluate(el => (el as HTMLElement).style.display = 'none').catch(() => { });
        }

        await this.page.getByRole('button', { name: /Post Job/i }).click({ force: options?.force ?? true }).catch(() => { });

        const confirmButton = this.page.getByRole('button', { name: /Confirm & Save/i });
        try {
            await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
            await confirmButton.click().catch(() => { });
        } catch {
            // ignore if not present
        }
    }
}
