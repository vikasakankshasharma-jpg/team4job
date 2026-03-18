import { test, expect } from '@playwright/test';
import { TestHelper } from '../utils/helpers';
import { ROUTES } from '../fixtures/test-data';
import { THRESHOLD_MS } from './config';

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

const Professional_PAGES = [
    { url: ROUTES.dashboard, name: 'Dashboard (Professional)' },
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

    test.describe('Client Session', () => {
        test('Measure full Client session load times', async ({ page }) => {
            const helper = new TestHelper(page);

            console.log('[PERF_FLOW] Starting Client Session');
            await helper.auth.loginAsClient();

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

    test.describe('Professional Session', () => {
        test('Measure full Professional session load times', async ({ page }) => {
            const helper = new TestHelper(page);

            console.log('[PERF_FLOW] Starting Professional Session');
            await helper.auth.loginAsProfessional();

            for (const pageInfo of Professional_PAGES) {
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


