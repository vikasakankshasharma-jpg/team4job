@echo off
echo Running Seed Script...
call npx tsx scripts/seed-emulator.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Smoke Tests...
call npm run test:smoke
if %errorlevel% neq 0 exit /b %errorlevel%
