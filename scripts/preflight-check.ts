import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk'; // You might need to install chalk or just use simpler console logs if not available. We'll use ANSI codes for simplicity.

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(msg: string) {
    console.log(msg);
}

function success(msg: string) {
    console.log(`${GREEN}✔ ${msg}${RESET}`);
}

function warning(msg: string) {
    console.log(`${YELLOW}⚠ ${msg}${RESET}`);
}

function error(msg: string) {
    console.log(`${RED}✖ ${msg}${RESET}`);
}

function checkEnv() {
    log(`\n${BOLD}Running Deployment Pre-flight Check...${RESET}\n`);

    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envLocalPath)) {
        warning('.env.local file not found. Assuming environment variables are set in system or Vercel.');
        return;
    }

    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    let hasIssues = false;

    // Check Sentry
    if (!envConfig.NEXT_PUBLIC_SENTRY_DSN) {
        error(`Missing NEXT_PUBLIC_SENTRY_DSN in .env.local`);
        log(`  👉 Action: Get DSN from Sentry.io and add it to .env.local`);
        hasIssues = true;
    } else {
        success(`Sentry DSN configured`);
    }

    // Check Firebase Plan (Manual Reminder)
    log(`\n${BOLD}Manual Verification Required:${RESET}`);
    log(`  [ ] Have you upgraded Firebase to 'Blaze' plan? (Required for SMS/Functions)`);
    log(`  [ ] Have you created Firestore Indexes? (Links in walkthrough.md)`);

    // Check Build Status (Simulated)
    if (fs.existsSync(path.resolve(process.cwd(), '.next'))) {
        success('Production build artifacts detected (.next folder)');
    } else {
        warning('No production build found. Run `npm run build` before deploying.');
        hasIssues = true;
    }

    if (hasIssues) {
        log(`\n${RED}${BOLD}❌ Pre-flight check failed via script checks.${RESET} Please resolve issues before deploying.`);
        process.exit(1);
    } else {
        log(`\n${GREEN}${BOLD}✔ Automatic checks passed!${RESET} Please confirm manual items above.`);
    }
}

checkEnv();
