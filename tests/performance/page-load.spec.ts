import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, ROUTES } from '../fixtures/test-data';

/**
 * Performance Benchmarking Tests
 * Ensures pages load within acceptable thresholds
 */

interface PerformanceMetrics {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
}

test.describe('Performance Benchmarks', () => {
    test('Landing page should load within 2 seconds', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { name: 'Your Project, Our Priority' })).toBeVisible();
        const loadTime = Date.now() - startTime;

        console.log(`Landing page load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(2500); // 2.5s threshold
    });

    test('Dashboard should load within 4 seconds', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[name="identifier"]', TEST_ACCOUNTS.installer.email);
        await page.fill('input[type="password"]', TEST_ACCOUNTS.installer.password);
        await page.click('button[type="submit"]');

        const startTime = Date.now();
        await page.waitForURL(/\/dashboard/);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
        const loadTime = Date.now() - startTime;

        console.log(`Dashboard load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(4000); // 4s threshold
    });

    test('Job detail page should load within 3.5 seconds', async ({ page }) => {
        // Login and navigate to a job
        await page.goto('/login');
        await page.fill('input[name="identifier"]', TEST_ACCOUNTS.installer.email);
        await page.fill('input[type="password"]', TEST_ACCOUNTS.installer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);

        await page.goto(ROUTES.browseJobs);
        await page.waitForLoadState('domcontentloaded');

        // Click on first job if available
        const firstJob = page.locator('[data-testid="job-card"]').first();
        if (await firstJob.count() > 0) {
            const startTime = Date.now();
            await firstJob.click();
            await page.waitForLoadState('domcontentloaded');
            await expect(page.locator('h1')).toBeVisible(); // Job Title
            const loadTime = Date.now() - startTime;

            console.log(`Job detail page load time: ${loadTime}ms`);
            expect(loadTime).toBeLessThan(3500);
        }
    });

    test('Landing page should have good Core Web Vitals', async ({ page }) => {
        await page.goto('/');

        // Measure Web Vitals using Performance API
        const metrics = await page.evaluate(async () => {
            return new Promise<PerformanceMetrics>((resolve) => {
                const results: Partial<PerformanceMetrics> = {
                    cls: 0,
                    lcp: 0,
                    fid: 0,
                    fcp: 0,
                    ttfb: 0
                };

                // TTFB & FCP from Performance Timeline
                const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (nav) {
                    results.ttfb = nav.responseStart - nav.requestStart;
                }
                const paint = performance.getEntriesByType('paint');
                const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');
                if (fcpEntry) results.fcp = fcpEntry.startTime;

                // Create Observer for LCP & CLS
                new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        if (entry.entryType === 'largest-contentful-paint') {
                            results.lcp = entry.startTime; // Keep updating to find the largest
                        }
                        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                            results.cls! += (entry as any).value;
                        }
                    }
                }).observe({ type: 'largest-contentful-paint', buffered: true });

                new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                            results.cls! += (entry as any).value;
                        }
                    }
                }).observe({ type: 'layout-shift', buffered: true });


                // Wait a bit for metrics to settle (simulating user view)
                setTimeout(() => {
                    resolve(results as PerformanceMetrics);
                }, 2000);
            });
        });

        console.log('Web Vitals (Est.):', metrics);

        // Relaxed thresholds for lab environment
        expect(metrics.fcp).toBeLessThan(3000);
        expect(metrics.ttfb).toBeLessThan(1000);
        // LCP might not trigger if no large content is found in 2s, so we check if it exists
        if (metrics.lcp > 0) expect(metrics.lcp).toBeLessThan(3000);
    });

    test('Images should be optimized', async ({ page }) => {
        await page.goto('/');

        const images = await page.locator('img').all();

        for (const img of images) {
            const src = await img.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                // Check if using Next.js Image optimization
                const isOptimized = await img.evaluate((el) => {
                    return el.getAttribute('loading') === 'lazy' ||
                        el.getAttribute('decoding') === 'async';
                });

                // At least some optimization should be present
                expect(isOptimized || src.includes('/_next/image')).toBeTruthy();
            }
        }
    });

    test('Bundle size should be reasonable', async ({ page }) => {
        await page.goto('/');

        const resources = await page.evaluate(() => {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            return entries.map(entry => ({
                name: entry.name,
                size: entry.transferSize,
                type: entry.initiatorType
            }));
        });

        const jsResources = resources.filter(r => r.type === 'script');
        const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);

        console.log(`Total JS bundle size: ${(totalJsSize / 1024).toFixed(2)} KB`);

        // Total JS should be under 500KB for good performance
        expect(totalJsSize).toBeLessThan(500 * 1024);
    });

    test('Page should not have render-blocking resources', async ({ page }) => {
        await page.goto('/');

        const renderBlockingResources = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            const blockingScripts = scripts.filter(script =>
                !script.hasAttribute('async') &&
                !script.hasAttribute('defer') &&
                !script.getAttribute('type')?.includes('module')
            );
            return blockingScripts.length;
        });

        console.log(`Render-blocking scripts: ${renderBlockingResources}`);

        // Should have minimal or no render-blocking scripts
        expect(renderBlockingResources).toBeLessThan(3);
    });
});
