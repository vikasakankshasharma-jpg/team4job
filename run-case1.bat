@echo off
echo Running Seed Script...
call npx tsx scripts/seed-emulator.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Case 1 - Standard Flow...
call npx playwright test tests/e2e/beta-squad-all.spec.ts -g "Case 1: Standard Flow" --project chromium
if %errorlevel% neq 0 exit /b %errorlevel%
