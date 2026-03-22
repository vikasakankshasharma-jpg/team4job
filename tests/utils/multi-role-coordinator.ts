import { Browser, BrowserContext, Page } from '@playwright/test';
import { TestHelper } from './helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

export class MultiRoleCoordinator {
    public clientContext!: BrowserContext;
    public proContext!: BrowserContext;
    public adminContext!: BrowserContext;
    public staffContext!: BrowserContext;

    public clientPage!: Page;
    public proPage!: Page;
    public adminPage!: Page;
    public staffPage!: Page;

    public clientHelper!: TestHelper;
    public proHelper!: TestHelper;
    public adminHelper!: TestHelper;
    public staffHelper!: TestHelper;

    constructor(private browser: Browser) {}

    async init() {
        // Create 4 independent contexts to simulate 4 different users simultaneously
        this.clientContext = await this.browser.newContext();
        this.proContext = await this.browser.newContext();
        this.adminContext = await this.browser.newContext();
        this.staffContext = await this.browser.newContext();

        this.clientPage = await this.clientContext.newPage();
        this.proPage = await this.proContext.newPage();
        this.adminPage = await this.adminContext.newPage();
        this.staffPage = await this.staffContext.newPage();

        this.clientHelper = new TestHelper(this.clientPage);
        this.proHelper = new TestHelper(this.proPage);
        this.adminHelper = new TestHelper(this.adminPage);
        this.staffHelper = new TestHelper(this.staffPage);

        // Optional: Add console listeners for coordination debugging
        this.setupLogging(this.clientPage, 'CLIENT');
        this.setupLogging(this.proPage, 'PRO');
        this.setupLogging(this.adminPage, 'ADMIN');
        this.setupLogging(this.staffPage, 'STAFF');
    }

    private setupLogging(page: Page, role: string) {
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('DEBUG') || text.includes('SYNC') || text.includes('Firebase')) {
                console.log(`[${role}] ${msg.type()}: ${text}`);
            }
        });
    }

    async loginAll() {
        console.log('[MultiRole] Logging in all roles sequentially...');
        await this.clientHelper.auth.loginAsClient();
        await this.proHelper.auth.loginAsProfessional();
        await this.adminHelper.auth.loginAsAdmin();
        await this.staffHelper.auth.login(TEST_ACCOUNTS.support.email, TEST_ACCOUNTS.support.password); // Staff (Support) role
        console.log('[MultiRole] All roles logged in.');
    }

    async closeAll() {
        await Promise.all([
            this.clientContext.close(),
            this.proContext.close(),
            this.adminContext.close(),
            this.staffContext.close()
        ]);
    }
}
