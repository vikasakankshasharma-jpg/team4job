
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });

/**
 * Playwright Configuration for Beta Squad Testing
 * Runs against local dev server on port 3006
 */
export default defineConfig({
    testDir: './tests/e2e',
    testMatch: 'beta-squad-*.spec.ts', // Only run beta squad tests

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: 0,

    /* Opt out of parallel tests on CI. */
    workers: 1,

    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:3006',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on failure */
        video: 'retain-on-failure',

        /* Maximum time each action can take - Increased for slow local env */
        actionTimeout: 120 * 1000,

        /* Maximum time for navigation - Increased for slow local env */
        navigationTimeout: 180 * 1000,
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npx next dev -p 3006',
        url: 'http://localhost:3006',
        reuseExistingServer: true, // Reuse the server we started
        timeout: 180000,
    },

    /* Global timeout for each test */
    timeout: 600000, // 10 mins per test

    /* Expect timeout */
    expect: {
        timeout: 60 * 1000,
    },
});
