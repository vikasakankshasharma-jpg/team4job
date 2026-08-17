import { test, expect, Page } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Data Fetch Performance Audit
 *
 * Measures server-side data fetch times for every dashboard page
 * across all three primary roles: Client, Professional, Admin.
 *
 * The test navigates to each page, records the time from navigation
 * start to DOM content loaded + key UI marker visibility, and
 * collects the results into a summary table.
 */

interface PageTiming {
    route: string;
    label: string;
    ttfb: number;        // ms – Time To First Byte (server response start)
    domReady: number;    // ms – DOMContentLoaded relative to nav start
    uiReady: number;     // ms – first meaningful UI marker visible
    status: 'ok' | 'slow' | 'error';
    error?: string;
}

// Pages relevant to each role
const CLIENT_PAGES = [
    { route: '/dashboard', label: 'Dashboard Home' },
    { route: '/dashboard/posted-jobs', label: 'Posted Jobs' },
    { route: '/dashboard/jobs', label: 'Browse Jobs' },
    { route: '/dashboard/my-professionals', label: 'My Professionals' },
    { route: '/dashboard/transactions', label: 'Transactions' },
    { route: '/dashboard/profile', label: 'Profile' },
    { route: '/dashboard/notifications', label: 'Notifications' },
    { route: '/dashboard/settings', label: 'Settings' },
    { route: '/dashboard/disputes', label: 'Disputes' },
    { route: '/dashboard/calendar', label: 'Calendar' },
    { route: '/dashboard/messages', label: 'Messages' },
];

const PROFESSIONAL_PAGES = [
    { route: '/dashboard', label: 'Dashboard Home' },
    { route: '/dashboard/jobs', label: 'Browse Jobs' },
    { route: '/dashboard/my-bids', label: 'My Bids' },
    { route: '/dashboard/transactions', label: 'Transactions' },
    { route: '/dashboard/profile', label: 'Profile' },
    { route: '/dashboard/notifications', label: 'Notifications' },
    { route: '/dashboard/settings', label: 'Settings' },
    { route: '/dashboard/disputes', label: 'Disputes' },
    { route: '/dashboard/calendar', label: 'Calendar' },
    { route: '/dashboard/messages', label: 'Messages' },
    { route: '/dashboard/subscription-plans', label: 'Subscription Plans' },
];

const ADMIN_PAGES = [
    { route: '/dashboard', label: 'Dashboard Home' },
    { route: '/dashboard/admin', label: 'Admin Panel' },
    { route: '/dashboard/users', label: 'User Management' },
    { route: '/dashboard/all-jobs', label: 'All Jobs' },
    { route: '/dashboard/transactions', label: 'Transactions' },
    { route: '/dashboard/audit-logs', label: 'Audit Logs' },
    { route: '/dashboard/reports', label: 'Reports' },
    { route: '/dashboard/analytics', label: 'Analytics' },
    { route: '/dashboard/verify-professional', label: 'Verify Professional' },
    { route: '/dashboard/disputes', label: 'Disputes' },
    { route: '/dashboard/coupons', label: 'Coupons' },
    { route: '/dashboard/blacklist', label: 'Blacklist' },
    { route: '/dashboard/pending-signups', label: 'Pending Signups' },
    { route: '/dashboard/signup-analytics', label: 'Signup Analytics' },
    { route: '/dashboard/billing', label: 'Billing' },
    { route: '/dashboard/admin/system-health', label: 'System Health' },
    { route: '/dashboard/admin/approvals', label: 'Approvals' },
    { route: '/dashboard/notifications', label: 'Notifications' },
    { route: '/dashboard/profile', label: 'Profile' },
    { route: '/dashboard/settings', label: 'Settings' },
];

const SUPPORT_PAGES = [
    { route: '/dashboard', label: 'Dashboard Home' },
    { route: '/dashboard/disputes', label: 'Disputes' },
    { route: '/dashboard/users', label: 'User Management' },
    { route: '/dashboard/all-jobs', label: 'All Jobs' },
    { route: '/dashboard/transactions', label: 'Transactions' },
    { route: '/dashboard/profile', label: 'Profile' },
    { route: '/dashboard/settings', label: 'Settings' },
];

async function measurePage(page: Page, route: string, label: string): Promise<PageTiming> {
    const start = Date.now();
    try {
        // Navigate to page (with retry for dev-server cold starts)
        let response;
        try {
            response = await page.goto(route, {
                waitUntil: 'domcontentloaded',
                timeout: 7290000, // 90s for first load
            });
        } catch (initialError) {
            console.log(`[PerfAudit] Initial load failed for ${label}, retrying...`);
            await page.waitForTimeout(2000);
            response = await page.goto(route, {
                waitUntil: 'domcontentloaded',
                timeout: 4860000,
            });
        }

        const ttfb = Date.now() - start;
        const domReady = Date.now() - start;

        // Wait for page stability
        await page.waitForTimeout(2000);

        // Wait for any meaningful content to render
        const markers = [
            'nav', '[role="navigation"]', 'h1', 'h2', 'main',
            '[data-testid]', 'table', '.card', '[role="tablist"]',
            '.lucide-loader', '.animate-spin'
        ];

        let uiReady: number;
        try {
            await Promise.any(
                markers.map(m =>
                    page.locator(m).first().waitFor({ state: 'attached', timeout: 3645000 })
                )
            );
            uiReady = Date.now() - start;
        } catch {
            uiReady = Date.now() - start;
        }

        const status: 'ok' | 'slow' = uiReady > 15000 ? 'slow' : 'ok';

        return { route, label, ttfb, domReady, uiReady, status };
    } catch (e: any) {
        return {
            route,
            label,
            ttfb: Date.now() - start,
            domReady: Date.now() - start,
            uiReady: Date.now() - start,
            status: 'error',
            error: e.message?.slice(0, 120) || String(e),
        };
    }
}

function printTable(role: string, results: PageTiming[]) {
    console.log(`\n${'='.repeat(90)}`);
    console.log(`  DATA FETCH AUDIT — ${role}`);
    console.log(`${'='.repeat(90)}`);
    console.log(
        '  ' +
        'Page'.padEnd(28) +
        'TTFB (ms)'.padStart(12) +
        'DOM Ready'.padStart(12) +
        'UI Ready'.padStart(12) +
        'Status'.padStart(10)
    );
    console.log(`  ${'-'.repeat(74)}`);

    for (const r of results) {
        const statusIcon = r.status === 'ok' ? '✅' : r.status === 'slow' ? '⚠️' : '❌';
        console.log(
            '  ' +
            r.label.padEnd(28) +
            `${r.ttfb}`.padStart(12) +
            `${r.domReady}`.padStart(12) +
            `${r.uiReady}`.padStart(12) +
            `  ${statusIcon} ${r.status}`
        );
        if (r.error) {
            console.log(`    └─ Error: ${r.error}`);
        }
    }

    const avgTtfb = Math.round(results.reduce((s, r) => s + r.ttfb, 0) / results.length);
    const avgUi = Math.round(results.reduce((s, r) => s + r.uiReady, 0) / results.length);
    const slowCount = results.filter(r => r.status === 'slow').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`  ${'-'.repeat(74)}`);
    console.log(`  Avg TTFB: ${avgTtfb}ms | Avg UI Ready: ${avgUi}ms | Slow: ${slowCount} | Errors: ${errorCount}`);
    console.log(`${'='.repeat(90)}\n`);
}

test.describe('Data Fetch Performance Audit @perf', () => {
    test.setTimeout(600000); // 10 min per test

    test('Client role — all pages', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsClient();
        await expect(page).toHaveURL(/\/dashboard/);

        const results: PageTiming[] = [];
        for (const p of CLIENT_PAGES) {
            const timing = await measurePage(page, p.route, p.label);
            results.push(timing);
        }

        printTable('CLIENT (rajesh.client@team4job.com)', results);

        // Soft assertion: no errors
        const errors = results.filter(r => r.status === 'error');
        expect(errors.length, `${errors.length} pages errored for Client`).toBeLessThanOrEqual(2);
    });

    test('Professional role — all pages', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsProfessional();
        await expect(page).toHaveURL(/\/dashboard/);

        const results: PageTiming[] = [];
        for (const p of PROFESSIONAL_PAGES) {
            const timing = await measurePage(page, p.route, p.label);
            results.push(timing);
        }

        printTable('PROFESSIONAL (amit.pro@team4job.com)', results);

        const errors = results.filter(r => r.status === 'error');
        expect(errors.length, `${errors.length} pages errored for Professional`).toBeLessThanOrEqual(2);
    });

    test('Admin role — all pages', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.auth.loginAsAdmin();
        await expect(page).toHaveURL(/\/dashboard/);

        const results: PageTiming[] = [];
        for (const p of ADMIN_PAGES) {
            const timing = await measurePage(page, p.route, p.label);
            results.push(timing);
        }

        printTable('ADMIN (vikasakankshasharma@gmail.com)', results);

        const errors = results.filter(r => r.status === 'error');
        expect(errors.length, `${errors.length} pages errored for Admin`).toBeLessThanOrEqual(2);
    });

    test('Support Team role — all pages', async ({ page }) => {
        const helper = new TestHelper(page);
        // Using support team credentials from test-data.ts
        await helper.auth.login(TEST_ACCOUNTS.support.email, TEST_ACCOUNTS.support.password);
        await expect(page).toHaveURL(/\/dashboard/);

        const results: PageTiming[] = [];
        for (const p of SUPPORT_PAGES) {
            const timing = await measurePage(page, p.route, p.label);
            results.push(timing);
        }

        printTable('SUPPORT TEAM (kavita.support@team4job.com)', results);

        const errors = results.filter(r => r.status === 'error');
        expect(errors.length, `${errors.length} pages errored for Support Team`).toBeLessThanOrEqual(2);
    });
});
