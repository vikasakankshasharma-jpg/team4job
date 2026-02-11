@echo off
echo ==========================================
echo 🚀 STARTING STAGING DEPLOYMENT
echo ==========================================

echo.
echo [1/5] 🔍 Checking Environment...
call npx tsx scripts/check-env.ts
if %errorlevel% neq 0 (
    echo ❌ Environment check failed.
    exit /b %errorlevel%
)

echo.
echo [2/5] 📐 Type Checking...
call npm run typecheck
if %errorlevel% neq 0 (
    echo ❌ Type check failed.
    exit /b %errorlevel%
)

echo.
echo [3/5] 🧹 Linting...
call npm run lint
if %errorlevel% neq 0 (
    echo ❌ Linting failed.
    exit /b %errorlevel%
)

echo.
echo [4/5] 🏗️  Building...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed.
    exit /b %errorlevel%
)

echo.
echo [5/5] ☁️  Deploying to Firebase (Staging)...
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
