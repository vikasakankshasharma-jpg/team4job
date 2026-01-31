import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.production if available, essentially just for secrets not needed by playwright itself maybe
dotenv.config({ path: path.resolve(__dirname, '.env.production'), override: true });

export default defineConfig({
    testDir: './tests',
    testMatch: '**/performance.spec.ts', // Only run performance test
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL: 'https://dodo-beta.web.app',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 60000,
        navigationTimeout: 60000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // No webServer block, assume site is live
    timeout: 120000,
    expect: {
        timeout: 10000,
    },
});
