import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from '../fixtures/test-data';
import * as fs from 'fs';
import * as path from 'path';

interface PageMetric {
    page: string;
    role: string;
    domContentLoadedTime: number;
    fullLoadTime: number;
    fcp: number;
    lcp: number;
    ttfb: number;
    jsSizeKb: number;
    requestCount: number;
    sidebarVisibleTime: number;
    contentVisibleTime: number;
    status: 'Pass' | 'Fail';
}

const metrics: PageMetric[] = [];
const REPORT_PATH = path.join(process.cwd(), 'test-results', 'performance-report.json');

// Run tests in sequence to capture all metrics in one report
test.describe.configure({ mode: 'serial' });

async function measurePage(page: any, url: string, role: string, threshold: number = 6000) {
    console.log(`Measuring ${url} for role ${role}...`);

    const startTime = Date.now();

    // 1. Initial navigation to DCL
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const domContentLoadedTime = Date.now() - startTime;

    // 2. Wait for full load (Load Event)
    await page.waitForLoadState('load');
    const fullLoadTime = Date.now() - startTime;

    // Measure parts relative to startTime
    let sidebarVisibleTime = 0;
    let contentVisibleTime = 0;

    try {
        const sidebar = page.locator('nav, .sidebar, [role="navigation"]').first();
        if (await sidebar.count() > 0) {
            await sidebar.waitFor({ state: 'visible', timeout: 3000 });
            sidebarVisibleTime = Date.now() - startTime;
        }

        const mainContent = page.locator('main, #content, .main-content').first();
        if (await mainContent.count() > 0) {
            await mainContent.waitFor({ state: 'visible', timeout: 3000 });
            contentVisibleTime = Date.now() - startTime;
        }
    } catch (e) {
        // Ignore component timeouts
    }

    const browserMetrics = await page.evaluate(async () => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');

        // Get LCP
        const lcpValue = await new Promise<number>((resolve) => {
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                resolve(lastEntry.startTime);
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            // Timeout if LCP not found
            setTimeout(() => resolve(0), 1000);
        });

        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const totalJsSize = resources
            .filter(r => r.initiatorType === 'script')
            .reduce((sum, r) => sum + (r.transferSize || 0), 0);

        return {
            ttfb: nav ? nav.responseStart - nav.requestStart : 0,
            fcp: fcpEntry ? fcpEntry.startTime : 0,
            lcp: lcpValue,
            jsSizeKb: totalJsSize / 1024,
            requestCount: resources.length
        };
    });

    const result: PageMetric = {
        page: url,
        role: role,
        domContentLoadedTime: domContentLoadedTime,
        fullLoadTime: fullLoadTime,
        fcp: browserMetrics.fcp,
        lcp: browserMetrics.lcp,
        ttfb: browserMetrics.ttfb,
        jsSizeKb: browserMetrics.jsSizeKb,
        requestCount: browserMetrics.requestCount,
        sidebarVisibleTime: sidebarVisibleTime,
        contentVisibleTime: contentVisibleTime,
        status: fullLoadTime < threshold ? 'Pass' : 'Fail'
    };

    metrics.push(result);
    return result;
}

test.describe('Full Site Performance Audit', () => {

    test.afterAll(async () => {
        if (!fs.existsSync(path.dirname(REPORT_PATH))) {
            fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
        }
        fs.writeFileSync(REPORT_PATH, JSON.stringify(metrics, null, 2));
        console.log(`Performance data saved to ${REPORT_PATH}`);
    });

    test('Public Pages Audit', async ({ page }) => {
        await measurePage(page, '/', 'Public');
        await measurePage(page, '/login', 'Public');
        await measurePage(page, '/privacy-policy', 'Public');
    });

    test('Job Giver Pages Audit', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="identifier"]', TEST_ACCOUNTS.jobGiver.email);
        await page.fill('input[type="password"]', TEST_ACCOUNTS.jobGiver.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);

        await measurePage(page, '/dashboard', 'Job Giver');
        await measurePage(page, '/dashboard/post-job', 'Job Giver');
        await measurePage(page, '/dashboard/posted-jobs', 'Job Giver');
        await measurePage(page, '/dashboard/profile', 'Job Giver');
    });

    test('Installer Pages Audit', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="identifier"]', TEST_ACCOUNTS.installer.email);
        await page.fill('input[type="password"]', TEST_ACCOUNTS.installer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);

        await measurePage(page, '/dashboard', 'Installer');
        await measurePage(page, '/dashboard/jobs', 'Installer');
        await measurePage(page, '/dashboard/my-bids', 'Installer');
    });

    test('Admin Pages Audit', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="identifier"]', TEST_ACCOUNTS.admin.email);
        await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);

        await measurePage(page, '/dashboard', 'Admin');
        await measurePage(page, '/dashboard/users', 'Admin');
        await measurePage(page, '/dashboard/all-jobs', 'Admin');
        await measurePage(page, '/dashboard/analytics', 'Admin');
    });
});
