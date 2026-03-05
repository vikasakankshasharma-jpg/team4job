@echo off
echo Running Seed Script...
call npx tsx scripts/seed-emulator.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Desktop User Flow...
call npx playwright test tests/e2e/desktop_user_flow.spec.ts
if %errorlevel% neq 0 exit /b %errorlevel%
