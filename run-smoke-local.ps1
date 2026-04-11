# ============================================================
# LOCAL SMOKE TEST RUNNER
# Mirrors exactly what CI does, sequentially:
# 1. Starts Firebase emulators in background
# 2. Starts Next.js production server in background  
# 3. Waits for both to be ready
# 4. Seeds test users via API
# 5. Runs smoke tests with verbose output
# ============================================================

$ErrorActionPreference = "Continue"
$ProjectId = $env:FIREBASE_PROJECT_ID
if (-not $ProjectId) {
    # Try reading from .firebaserc
    $rc = Get-Content ".firebaserc" | ConvertFrom-Json
    $ProjectId = $rc.projects.default
}

Write-Host "=== Team4Job Local Smoke Test Runner ===" -ForegroundColor Cyan
Write-Host "Project ID: $ProjectId" -ForegroundColor Yellow
Write-Host ""

# Kill any existing processes on our ports
Write-Host "[1/6] Clearing ports 3000, 8080, 9099, 9199..." -ForegroundColor Blue
$ports = @(3000, 8080, 9099, 9199, 4000)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($proc) {
        $pid = $proc.OwningProcess | Select-Object -First 1
        if ($pid -and $pid -ne 0) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  Killed process on port $port (PID: $pid)" -ForegroundColor Gray
        }
    }
}
Start-Sleep -Seconds 2

# Start Firebase emulators in background
Write-Host "[2/6] Starting Firebase emulators..." -ForegroundColor Blue
$emulatorJob = Start-Job -ScriptBlock {
    param($dir, $projectId)
    Set-Location $dir
    npx firebase emulators:start --only auth,firestore,storage --project $projectId > emulator_local.log 2>&1
} -ArgumentList (Get-Location).Path, $ProjectId

Start-Sleep -Seconds 3

# Start Next.js server
Write-Host "[3/6] Starting Next.js server..." -ForegroundColor Blue
$serverJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:NEXT_PUBLIC_USE_FIREBASE_EMULATOR = "true"
    $env:NEXT_PUBLIC_USE_EMULATOR = "true"
    $env:NEXT_PUBLIC_E2E = "true"
    $env:ALLOW_E2E_SEED = "true"
    $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
    $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
    $env:FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199"
    npm run dev -- -p 3000 > server_local.log 2>&1
} -ArgumentList (Get-Location).Path

# Wait for emulators (port 9099)
Write-Host "[4/6] Waiting for emulators and server..." -ForegroundColor Blue
$maxWait = 120
$waited = 0
while ($waited -lt $maxWait) {
    $authReady = $false
    $serverReady = $false
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:9099" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($r.StatusCode -lt 500) { $authReady = $true }
    } catch {}
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($r.StatusCode -lt 500) { $serverReady = $true }
    } catch {}
    
    if ($authReady -and $serverReady) {
        Write-Host "  Both emulator (9099) and server (3000) are READY!" -ForegroundColor Green
        break
    }
    Write-Host "  Waiting... Emulator=$authReady Server=$serverReady (${waited}s/${maxWait}s)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
    $waited += 3
}

# Seed test users
Write-Host "[5/6] Seeding test users..." -ForegroundColor Blue
$seedSuccess = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/e2e/seed-users" -Method POST -TimeoutSec 30
        if ($response.success) {
            Write-Host "  Seeding SUCCESSFUL on attempt $i" -ForegroundColor Green
            $seedSuccess = $true
            break
        }
    } catch {
        Write-Host "  Seed attempt $i failed: $($_.Exception.Message)" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}

if (-not $seedSuccess) {
    Write-Host "ERROR: Could not seed test users. Checking seed API response..." -ForegroundColor Red
    try {
        $raw = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/e2e/seed-users" -Method POST -TimeoutSec 30
        Write-Host "Seed API Response: $($raw.Content)" -ForegroundColor Red
    } catch {
        Write-Host "Seed API Exception: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host "Aborting - tests would fail without seeded users." -ForegroundColor Red
    Stop-Job $emulatorJob, $serverJob -ErrorAction SilentlyContinue
    exit 1
}

# Run smoke tests
Write-Host "[6/6] Running smoke tests..." -ForegroundColor Blue
Write-Host ""

$env:BASE_URL = "http://127.0.0.1:3000"
$env:CI = "true"
$env:NEXT_PUBLIC_IS_CI = "true"

npx playwright test tests/e2e/smoke.spec.ts --workers=1 --reporter=list 2>&1 | Tee-Object -FilePath "smoke_local_run.log"

Write-Host ""
Write-Host "=== Smoke test run complete. Report saved to smoke_local_run.log ===" -ForegroundColor Cyan

# Cleanup
Stop-Job $emulatorJob, $serverJob -ErrorAction SilentlyContinue
Remove-Job $emulatorJob, $serverJob -ErrorAction SilentlyContinue
