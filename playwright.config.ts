import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In CI, variables are injected by GitHub Actions. Locally, we load them from .env files.
if (!process.env.CI) {
    // Load environment variables from .env.local
    dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });
    // Load .env.test if it exists (for emulator support)
    dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: true });
}

/**
 * Playwright Configuration for E2E Testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.ts',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        /* Using Firebase Emulator port (5000) for stability instead of next dev (3006) */
        baseURL: 'http://localhost:5000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on failure */
        video: 'retain-on-failure',

        /* Maximum time each action can take */
        actionTimeout: 90 * 1000,

        /* Maximum time for navigation */
        navigationTimeout: 90 * 1000,
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
        command: process.env.CI
            ? 'npx next start -p 5000'
            : 'cross-env FIRESTORE_EMULATOR_HOST=localhost:8080 npx next start -p 5000',
        url: 'http://localhost:5000',
        // Reusing an existing server can accidentally attach Playwright to `next dev`,
        // which is much more prone to reload/frame-detach issues during E2E.
        reuseExistingServer: !process.env.CI,
        timeout: 180000, // 3 mins for server start
        env: process.env.CI ? {
            ALLOW_E2E_SEED: 'true',
            NEXT_PUBLIC_E2E: 'true',
        } : {
            FIRESTORE_EMULATOR_HOST: 'localhost:8080',
            FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
            ALLOW_E2E_SEED: 'true',
            NEXT_PUBLIC_E2E: 'true',
            NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
        },
    },

    /* Global timeout for each test */
    timeout: 180000, // 3 mins per test

    /* Expect timeout */
    expect: {
        timeout: 90 * 1000,
    },
});
