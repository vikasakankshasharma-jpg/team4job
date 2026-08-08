import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getWebServerEnv = () => {
    const rawEnv: Record<string, string | undefined> = { ...process.env };
    // Force CI indicator for consistency
    if (rawEnv.GITHUB_ACTIONS) rawEnv.CI = 'true';

    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawEnv)) {
        if (typeof v === 'string') env[k] = v;
    }

    const inferredProjectId = env.GCLOUD_PROJECT || env.FIREBASE_PROJECT_ID || env.DO_FIREBASE_PROJECT_ID;
    const isCi = !!env.CI;

    // Only force emulators/seeding if in CI or if not already explicitly disabled locally
    env.ALLOW_E2E_SEED = isCi ? 'true' : (env.ALLOW_E2E_SEED ?? 'true');
    env.NEXT_PUBLIC_E2E = isCi ? 'true' : (env.NEXT_PUBLIC_E2E ?? 'true');
    env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = isCi ? 'true' : (env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR ?? 'true');
    env.NEXT_PUBLIC_USE_EMULATOR = isCi ? 'true' : (env.NEXT_PUBLIC_USE_EMULATOR ?? 'true');

    // In emulator/E2E mode we MUST align the Firebase project id with the emulator project.
    // `firebase emulators:exec --project X` sets `GCLOUD_PROJECT=X`.
    if (inferredProjectId) {
        env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = inferredProjectId;
        env.FIREBASE_PROJECT_ID = inferredProjectId;
        env.DO_FIREBASE_PROJECT_ID = inferredProjectId;
    }

    // Explicitly unset emulator hosts if we are not in CI and emulators are disabled
    const useEmulator = env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || env.NEXT_PUBLIC_USE_EMULATOR === 'true';
    if (!isCi && !useEmulator) {
        delete env.FIRESTORE_EMULATOR_HOST;
        delete env.FIREBASE_AUTH_EMULATOR_HOST;
        delete env.FIREBASE_STORAGE_EMULATOR_HOST;
    } else if (useEmulator) {
        // Ensure defaults if missing
        env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
        env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
        env.FIREBASE_STORAGE_EMULATOR_HOST = env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
    }

    return env;
};

// In CI, variables are injected by GitHub Actions. Locally, we load them from .env files.
if (!process.env.CI) {
    // Load environment variables from .env.local
    dotenv.config({ path: path.resolve(__dirname, '.env.local') });
    // Load .env.test if it exists (for emulator support). Test variables MUST NOT override explicitly passed system variables.
    dotenv.config({ path: path.resolve(__dirname, '.env.test') });
}

/**
 * Playwright Configuration for E2E Testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.ts',

    /* Beta Squad tests share a single mutable Firebase emulator — run serially */
    /* Each shard runs sequentially to prevent emulator state collisions */
    fullyParallel: false,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry flaky tests caused by emulator timing (CI: 2, local: 2) */
    /* In CI, retry once only. Locally, 0 to prevent emulator memory buildup */
    retries: process.env.CI ? 1 : 0,

    /* Use multi workers to speed up execution */
    workers: 1,

    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['list'],
        ['html'],
        ['./tests/utils/CustomProgressReporter.ts']
    ],

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        /* Using port 3000 for local dev server consistency */
        baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on failure */
        video: 'retain-on-failure',

        /* Maximum time each action can take */
        actionTimeout: 30 * 1000,

        /* Maximum time for navigation */
        navigationTimeout: 60 * 1000,

        /* 🛡️ Global Mocking Script: Injected into every page context to prevent external API leakage */
        /* This ensures that even if a developer forgets to mock locally, the CI never hangs. */
        /* It mocks: 1. Google Maps Geocoder, 2. Postal Pincode API (fetch) */
        launchOptions: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
        /* Init scripts run before any other script in the page */
        contextOptions: {
            ignoreHTTPSErrors: true,
        },
        /* 🛡️ Global Mocking Script: Injected into every page context to prevent external API leakage */
        /* This ensures that even if a developer forgets to mock locally, the CI never hangs. */
        /* It mocks: 1. Google Maps Geocoder, 2. Postal Pincode API (fetch) */
        initScript: {
            content: `
                // 🛑 Mock Google Maps Geocoder to prevent "NoApiKeys" hangs
                window.google = window.google || {};
                window.google.maps = window.google.maps || {
                    Geocoder: class {
                        geocode(req, cb) {
                            cb([{ geometry: { location: { lat: () => 12.9716, lng: () => 77.5946 } } }], 'OK');
                        }
                    },
                    GeocoderStatus: { OK: 'OK' }
                };

                // 🛑 Mock fetch for Indian Postal Pincode API
                const originalFetch = window.fetch;
                window.fetch = async (...args) => {
                    const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
                    if (url.includes('postalpincode.in/pincode/')) {
                        console.log('[E2E-GLOBAL-MOCK] Intercepting Pincode API:', url);
                        return {
                            ok: true,
                            json: async () => [{
                                Status: 'Success',
                                Message: 'Number of pincode(s) found:1',
                                PostOffice: [{ Name: 'Mocked PO', District: 'Bangalore', State: 'Karnataka', Country: 'India' }]
                            }]
                        };
                    }
                    return originalFetch(...args);
                };
            `
        }
    },

    /* Apply global init script to all projects via projects metadata or use block */
    /* We use the 'use' block for global application */
    /* eslint-disable no-empty */

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 12'] },
        }
    ],

    /* Run your local dev server before starting the tests.
     * CRITICAL: reuseExistingServer MUST be true in CI because the workflow
     * manually starts the production server before Playwright runs.
     * Setting it to false causes Playwright to attempt to start a second
     * process on port 3000, which fails with EADDRINUSE.
     */
    webServer: {
        command: process.env.CI ? 'npm run start -- -p 3000' : 'npx rimraf .next && cross-env NODE_OPTIONS="--max-old-space-size=8192" npm run dev -- -H 127.0.0.1',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: true, // Always reuse — CI starts server manually
        stdout: 'pipe',
        stderr: 'pipe',
        env: getWebServerEnv(),
        timeout: process.env.CI ? 120000 : 600000,
    },

    /* Global timeout for each test */
    /* Per-test timeout:
     * - CI job timeout is 60 min total for the shard
     * - With retries=1, each test can run at most 2x
     * - Keep at 8 min per test so a shard with 3-4 tests stays well within 60 min
     * - @slow tests (beta-squad, milestones) are excluded from the regression shard
     */
    timeout: process.env.CI ? 15 * 60 * 1000 : 15 * 60 * 1000,

    /* Expect timeout */
    expect: {
        timeout: 30 * 1000,
    },
});

