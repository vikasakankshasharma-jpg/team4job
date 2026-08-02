@echo off
echo Seeding database...
call npx tsx scripts/seed-emulator.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Starting Playwright tests...
call npx playwright test --reporter=line
if %errorlevel% neq 0 exit /b %errorlevel%
