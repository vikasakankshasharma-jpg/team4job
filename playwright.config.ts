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
    }

    return env;
};

// In CI, variables are injected by GitHub Actions. Locally, we load them from .env files.
if (!process.env.CI) {
    // Load environment variables from .env.local
    dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });
    // Load .env.test if it exists (for emulator support). Test variables MUST override local variables
    dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: true });
}

/**
 * Playwright Configuration for E2E Testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.ts',

    /* Beta Squad tests share a single mutable Firebase emulator — run serially */
    fullyParallel: false,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry flaky tests caused by emulator timing (CI: 2, local: 1) */
    retries: process.env.CI ? 2 : 1,

    /* Single worker to prevent emulator state collisions */
    workers: 1,

    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        /* Using Firebase Emulator port (5000) for stability instead of next dev (3006) */
        baseURL: process.env.BASE_URL || 'http://localhost:5000',

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
            : 'npm run build && npx next start -p 5000',
        url: 'http://localhost:5000',
        // Reusing an existing server can accidentally attach Playwright to `next dev`,
        // which is much more prone to reload/frame-detach issues during E2E.
        reuseExistingServer: !process.env.CI,
        timeout: 600000, // 10 mins for server start (Windows/CI can be slow)
        env: process.env.CI
            ? getWebServerEnv()
            : (() => {
                const baseEnv = getWebServerEnv();
                const useEmu = baseEnv.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || baseEnv.NEXT_PUBLIC_USE_EMULATOR === 'true';
                if (useEmu) {
                    return {
                        ...baseEnv,
                        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
                        FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
                        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
                    };
                }
                // When emulators are disabled, ensure these variables are actively stripped
                // so they don't leak from the host environment
                delete baseEnv.FIRESTORE_EMULATOR_HOST;
                delete baseEnv.FIREBASE_STORAGE_EMULATOR_HOST;
                delete baseEnv.FIREBASE_AUTH_EMULATOR_HOST;
                return baseEnv;
            })(),
    },

    /* Global timeout for each test */
    timeout: 600000, // 10 mins per test (Beta Squad tests are complex)

    /* Expect timeout */
    expect: {
        timeout: 90 * 1000,
    },
});
