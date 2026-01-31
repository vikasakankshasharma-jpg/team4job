import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { ROUTES } from '../fixtures/test-data';

const THRESHOLD_MS = 5000; // 5 seconds initial threshold to account for dev mode

const PUBLIC_PAGES = [
    { url: '/', name: 'Landing Page' },
    { url: ROUTES.login, name: 'Login Page' },
    { url: '/privacy-policy', name: 'Privacy Policy' },
];

const JOB_GIVER_PAGES = [
    { url: ROUTES.dashboard, name: 'Dashboard (JG)' },
    { url: ROUTES.postJob, name: 'Post Job' },
    { url: ROUTES.postedJobs, name: 'Posted Jobs' },
    { url: ROUTES.profile, name: 'Profile (JG)' },
];

const INSTALLER_PAGES = [
    { url: ROUTES.dashboard, name: 'Dashboard (Installer)' },
    { url: ROUTES.browseJobs, name: 'Browse Jobs' },
    { url: ROUTES.myBids, name: 'My Bids' },
    { url: ROUTES.transactions, name: 'Transactions' },
];

test.describe('Performance Benchmark', () => {

    test.describe('Public Pages', () => {
        for (const pageInfo of PUBLIC_PAGES) {
            test(`Load time: ${pageInfo.name}`, async ({ page }) => {
                const startTime = Date.now();
                await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
                const endTime = Date.now();
                const duration = endTime - startTime;

                console.log(`[PERF] ${pageInfo.name}: ${duration}ms`);
                expect(duration, `Page ${pageInfo.name} took too long (${duration}ms)`).toBeLessThan(THRESHOLD_MS);
            });
        }
    });

    test.describe('Job Giver Session', () => {
        test('Measure full Job Giver session load times', async ({ page }) => {
            const helper = new TestHelper(page);

            console.log('[PERF_FLOW] Starting Job Giver Session');
            await helper.auth.loginAsJobGiver();

            for (const pageInfo of JOB_GIVER_PAGES) {
                const startTime = Date.now();
                await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
                const endTime = Date.now();
                const duration = endTime - startTime;

                console.log(`[PERF] ${pageInfo.name}: ${duration}ms`);
                expect(duration, `Page ${pageInfo.name} took too long (${duration}ms)`).toBeLessThan(THRESHOLD_MS);
            }
        });
    });

    test.describe('Installer Session', () => {
        test('Measure full Installer session load times', async ({ page }) => {
            const helper = new TestHelper(page);

            console.log('[PERF_FLOW] Starting Installer Session');
            await helper.auth.loginAsInstaller();

            for (const pageInfo of INSTALLER_PAGES) {
                const startTime = Date.now();
                await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
                const endTime = Date.now();
                const duration = endTime - startTime;

                console.log(`[PERF] ${pageInfo.name}: ${duration}ms`);
                expect(duration, `Page ${pageInfo.name} took too long (${duration}ms)`).toBeLessThan(THRESHOLD_MS);
            }
        });
    });

});
