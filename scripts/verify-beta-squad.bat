@echo off
REM scripts/verify-beta-squad.bat
REM This script runs the user seeding and Playwright test suite for Beta Squad

echo Step 1: Seeding Test Users...
call npx ts-node scripts/seed-users.ts
if %errorlevel% neq 0 (
    echo Seeding Failed. Check logs.
    exit /b %errorlevel%
)

echo Step 2: Running Beta Squad Test Suite...
call npx playwright test tests/e2e/beta-squad-all.spec.ts --config playwright.beta.config.ts
if %errorlevel% neq 0 (
    echo Test Suite Failed. Check html report.
    call npx playwright show-report
    exit /b %errorlevel%
)

echo Success: All Steps Passed!
exit /b 0
