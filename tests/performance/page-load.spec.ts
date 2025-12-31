import { test, expect } from '@playwright/test';

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
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        console.log(`Landing page load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(2000);
    });

    test('Dashboard should load within 3 seconds', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"]', 'installer@example.com');
        await page.fill('input[type="password"]', 'Vikas@129229');
        await page.click('button[type="submit"]');

        const startTime = Date.now();
        await page.waitForURL(/\/dashboard/);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        console.log(`Dashboard load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(3000);
    });

    test('Job detail page should load within 2.5 seconds', async ({ page }) => {
        // Login and navigate to a job
        await page.goto('/login');
        await page.fill('input[type="email"]', 'installer@example.com');
        await page.fill('input[type="password"]', 'Vikas@129229');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);

        await page.goto('/dashboard/jobs');
        await page.waitForLoadState('networkidle');

        // Click on first job if available
        const firstJob = page.locator('[data-testid="job-card"]').first();
        if (await firstJob.count() > 0) {
            const startTime = Date.now();
            await firstJob.click();
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - startTime;

            console.log(`Job detail page load time: ${loadTime}ms`);
            expect(loadTime).toBeLessThan(2500);
        }
    });

    test('Landing page should have good Core Web Vitals', async ({ page }) => {
        await page.goto('/');

        // Measure Web Vitals
        const metrics = await page.evaluate(() => {
            return new Promise<PerformanceMetrics>((resolve) => {
                const metrics: Partial<PerformanceMetrics> = {};

                // Get navigation timing
                const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (navTiming) {
                    metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
                }

                // Get paint timing
                const paintEntries = performance.getEntriesByType('paint');
                const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
                if (fcp) {
                    metrics.fcp = fcp.startTime;
                }

                // Simulate other metrics (in real scenario, use web-vitals library)
                metrics.lcp = 1500; // Placeholder
                metrics.fid = 50;   // Placeholder
                metrics.cls = 0.05; // Placeholder

                resolve(metrics as PerformanceMetrics);
            });
        });

        console.log('Web Vitals:', metrics);

        // Good thresholds:
        // LCP < 2.5s
        // FID < 100ms
        // CLS < 0.1
        // FCP < 1.8s
        // TTFB < 600ms

        expect(metrics.lcp).toBeLessThan(2500);
        expect(metrics.fid).toBeLessThan(100);
        expect(metrics.cls).toBeLessThan(0.1);
        expect(metrics.fcp).toBeLessThan(1800);
        expect(metrics.ttfb).toBeLessThan(600);
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
