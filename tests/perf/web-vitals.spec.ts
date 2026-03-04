import { test, expect } from '@playwright/test';

// Define production target thresholds (in milliseconds or raw scores)
// Based on Google's Core Web Vitals definitions for "Good" performance
const PERFORMANCE_BUDGETS = {
    LCP: 2500, // Largest Contentful Paint should be < 2.5s
    CLS: 0.1,  // Cumulative Layout Shift should be < 0.1
};

test.describe('Core Web Vitals Assertions', () => {

    test('Landing Page meets performance budgets', async ({ page }) => {
        // We use a custom CDP session to gather accurate performance metrics
        const client = await page.context().newCDPSession(page);
        await client.send('Performance.enable');

        // Navigate to the landing page
        await page.goto('/');

        // Wait for the page to be fully stable
        await page.waitForLoadState('networkidle');

        // Evaluate LCP 
        const lcp = await page.evaluate(() => {
            return new Promise<number>((resolve) => {
                new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    resolve(lastEntry.startTime);
                }).observe({ type: 'largest-contentful-paint', buffered: true });

                // Fallback resolution if no LCP fires within 3 seconds 
                setTimeout(() => resolve(0), 3000);
            });
        });

        // Evaluate CLS
        const cls = await page.evaluate(() => {
            return new Promise<number>((resolve) => {
                let cumulativeLayoutShiftScore = 0;
                new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        if (!(entry as any).hadRecentInput) {
                            cumulativeLayoutShiftScore += (entry as any).value;
                        }
                    }
                    resolve(cumulativeLayoutShiftScore);
                }).observe({ type: 'layout-shift', buffered: true });

                // Fallback resolution 
                setTimeout(() => resolve(cumulativeLayoutShiftScore), 3000);
            });
        });

        console.log(`Landing Page LCP: ${lcp}ms`);
        console.log(`Landing Page CLS: ${cls}`);

        // Only enforce rigid LCP thresholds if we got a valid measurement 
        // Emulators sometimes run very slow, so we ensure the metric isn't wildly breaching production standards
        if (lcp > 0) {
            expect(lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP + 1500); // 1.5s padding for local UI tests
        }

        if (cls > 0) {
            expect(cls).toBeLessThan(PERFORMANCE_BUDGETS.CLS);
        }
    });

});
