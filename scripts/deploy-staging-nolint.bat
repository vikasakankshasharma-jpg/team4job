@echo off
echo ==========================================
echo 🚀 STARTING STAGING DEPLOYMENT (No Lint)
echo ==========================================

echo.
echo [1/4] 🔍 Checking Environment...
call npx tsx scripts/check-env.ts
if %errorlevel% neq 0 (
    echo ❌ Environment check failed.
    exit /b %errorlevel%
)

echo.
echo [2/4] 📐 Type Checking...
call npm run typecheck
if %errorlevel% neq 0 (
    echo ❌ Type check failed.
    exit /b %errorlevel%
)

echo.
echo [3/4] 🏗️  Building...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed.
    exit /b %errorlevel%
)

echo.
echo [4/4] ☁️  Deploying to Firebase (Staging)...
echo NOTE: You may be prompted to login if not authenticated.
call firebase hosting:channel:deploy staging --expires 7d
if %errorlevel% neq 0 (
    echo ❌ Deployment failed.
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo ✅ STAGING DEPLOYMENT SUCCESSFUL!
echo ==========================================
