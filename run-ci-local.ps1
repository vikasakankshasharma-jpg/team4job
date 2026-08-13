#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Replicate the GitHub CI/CD pipeline locally on Windows.
    Run the exact same tests with the exact same environment as CI.

.DESCRIPTION
    This script mirrors every step of .github/workflows/ci-cd.yml:
      1. Lint & Type Check
      2. Production Build
      3. Firebase Emulators (clean start)
      4. Next.js Production Server
      5. Test Data Seeding
      6. Smoke HTTP Tests
      7. Smoke Auth Tests (5 specs)
      8. Full E2E Tests (20 groups)
      9. Edge Case Tests
      10. Cleanup & Summary

.PARAMETER Suite
    Which test suite to run: all, lint, smoke-http, smoke-auth, e2e, edge, full
    'full' = smoke-http + smoke-auth + e2e + edge (skips lint/build)
    'all' = lint + build + full

.PARAMETER Group
    Run a specific E2E group (1-20). 0 = all groups. Only applies to -Suite e2e or all.

.PARAMETER SkipBuild
    Skip lint, typecheck, and production build. Use when you've already built recently.

.PARAMETER SkipLint
    Skip only lint & typecheck. Still runs the production build.

.PARAMETER TestFile
    Run a specific test file instead of the suite. Overrides -Suite.

.PARAMETER Headed
    Run Playwright in headed mode (visible browser) for debugging.

.PARAMETER KeepRunning
    Don't kill emulators and Next.js server after tests finish.

.PARAMETER Retries
    Number of retries for failed tests (default: 1, same as CI).

.EXAMPLE
    .\run-ci-local.ps1
    # Full CI pipeline

.EXAMPLE
    .\run-ci-local.ps1 -Suite smoke-auth
    # Just smoke auth tests

.EXAMPLE
    .\run-ci-local.ps1 -Suite e2e -Group 7
    # Just E2E group 7

.EXAMPLE
    .\run-ci-local.ps1 -TestFile "tests/e2e/complete-transaction-cycle.spec.ts" -Headed
    # Debug a specific test with visible browser

.EXAMPLE
    .\run-ci-local.ps1 -SkipBuild -KeepRunning
    # Quick re-run: skip build, keep services alive for next run
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('all', 'lint', 'smoke-http', 'smoke-auth', 'e2e', 'edge', 'full')]
    [string]$Suite = 'all',

    [Parameter(Mandatory = $false)]
    [ValidateRange(0, 20)]
    [int]$Group = 0,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$SkipLint,

    [Parameter(Mandatory = $false)]
    [string]$TestFile = '',

    [Parameter(Mandatory = $false)]
    [switch]$Headed,

    [Parameter(Mandatory = $false)]
    [switch]$KeepRunning,

    [Parameter(Mandatory = $false)]
    [int]$Retries = 1
)

# ==============================================================================
# CONFIGURATION — mirrors .github/workflows/ci-cd.yml
# ==============================================================================

$ErrorActionPreference = 'Continue'
$script:StartTime = Get-Date
$script:Results = [ordered]@{}
$script:EmulatorProcess = $null
$script:NextJsProcess = $null
$script:ExitCode = 0

# Ports used by Firebase Emulators and Next.js
$PORTS = @{
    Auth      = 9099
    Firestore = 8080
    Storage   = 9199
    EmulatorUI = 4000
    NextJs    = 3000
}

# E2E Group → Test File mapping (mirrors CI's case statement exactly)
$E2E_GROUPS = @{
    1  = @("tests/e2e/edge-cases.spec.ts")
    2  = @("tests/e2e/beta-squad-batch-1.spec.ts")
    3  = @("tests/e2e/beta-squad-batch-2.spec.ts")
    4  = @("tests/e2e/beta-squad-batch-3.spec.ts")
    5  = @("tests/e2e/beta-squad-batch-4.spec.ts")
    6  = @("tests/e2e/beta-squad-batch-5.spec.ts")
    7  = @("tests/e2e/complete-transaction-cycle.spec.ts")
    8  = @("tests/e2e/universal-master-audit.spec.ts")
    9  = @("tests/e2e/data-fetch-audit.spec.ts")
    10 = @("tests/e2e/dispute-refund-audit.spec.ts")
    11 = @("tests/e2e/admin-smoke.spec.ts", "tests/e2e/ui-audit-all-roles.spec.ts")
    12 = @("tests/e2e/beta-squad-case-1.spec.ts", "tests/e2e/budget-estimator.spec.ts")
    13 = @("tests/e2e/accessibility.spec.ts", "tests/e2e/analytics-dashboard.spec.ts", "tests/e2e/audit_wizard.spec.ts")
    14 = @("tests/e2e/desktop_user_flow.spec.ts", "tests/e2e/final-polish.spec.ts", "tests/e2e/invoice.spec.ts")
    15 = @("tests/e2e/offline-mode.spec.ts", "tests/e2e/partner-onboarding.spec.ts", "tests/e2e/performance.spec.ts")
    16 = @("tests/e2e/support-tickets.spec.ts", "tests/e2e/team-management.spec.ts", "tests/e2e/variation-orders.spec.ts")
    17 = @("tests/e2e/bulk-suite-verification.spec.ts", "tests/e2e/calendar-view.spec.ts", "tests/e2e/coordination-sync.spec.ts", "tests/e2e/coupons-discounts.spec.ts")
    18 = @("tests/e2e/milestones.spec.ts", "tests/e2e/mobile-responsiveness.spec.ts", "tests/e2e/mobile_user_flow.spec.ts", "tests/e2e/notifications-system.spec.ts")
    19 = @("tests/e2e/profile-settings.spec.ts", "tests/e2e/reviews.spec.ts", "tests/e2e/role-redirects.spec.ts", "tests/e2e/self-bid-protection.spec.ts")
    20 = @("tests/e2e/verify-new-features.spec.ts", "tests/e2e/wallet-withdrawals.spec.ts", "tests/e2e/ux-enhancements.spec.ts", "tests/e2e/role-switching.spec.ts", "tests/e2e/dashboard-financials.spec.ts")
}

# Smoke auth test files (mirrors CI matrix)
$SMOKE_AUTH_FILES = @(
    "tests/e2e/smoke-auth/01-client-login.spec.ts",
    "tests/e2e/smoke-auth/02-pro-login.spec.ts",
    "tests/e2e/smoke-auth/03-admin-login.spec.ts",
    "tests/e2e/smoke-auth/04-client-wizard.spec.ts",
    "tests/e2e/smoke-auth/05-pro-browse.spec.ts"
)

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

function Write-Banner {
    param([string]$Text, [string]$Color = 'Cyan')
    $line = '=' * 70
    Write-Host ""
    Write-Host $line -ForegroundColor $Color
    Write-Host "  $Text" -ForegroundColor $Color
    Write-Host $line -ForegroundColor $Color
    Write-Host ""
}

function Write-Step {
    param([string]$StepNum, [string]$Text)
    Write-Host "[$StepNum] $Text" -ForegroundColor Yellow
}

function Write-Ok {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Text)
    Write-Host "  [FAIL] $Text" -ForegroundColor Red
}

function Write-Info {
    param([string]$Text)
    Write-Host "  [INFO] $Text" -ForegroundColor Gray
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  [WARN] $Text" -ForegroundColor DarkYellow
}

function Read-EnvFile {
    <#
    .SYNOPSIS
        Parse a .env file and return a hashtable of key=value pairs.
    #>
    param([string]$Path)
    $vars = @{}
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
                $eqIdx = $line.IndexOf('=')
                $key = $line.Substring(0, $eqIdx).Trim()
                $val = $line.Substring($eqIdx + 1).Trim()
                # Remove surrounding quotes
                if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                    $val = $val.Substring(1, $val.Length - 2)
                }
                $vars[$key] = $val
            }
        }
    }
    return $vars
}

function Stop-ProcessOnPort {
    <#
    .SYNOPSIS
        Kill any process listening on the given TCP port.
    #>
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                if ($pid -gt 0) {
                    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Info "Killing process $($proc.ProcessName) (PID: $pid) on port $Port"
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch {
        # Port not in use, which is fine
    }
}

function Wait-ForPort {
    <#
    .SYNOPSIS
        Wait for a HTTP service to respond on the given URL.
    #>
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$MaxAttempts = 60,
        [int]$IntervalSeconds = 5
    )
    Write-Info "Waiting for $ServiceName on $Url..."

    for ($i = 1; $i -le $MaxAttempts; $i++) {
        $exitCode = -1
        try {
            $null = & curl.exe -s -o NUL -w "%{http_code}" -m 3 $Url
            $exitCode = $LASTEXITCODE
        } catch {
            # Ignore
        }

        if ($exitCode -eq 0) {
            Write-Ok "$ServiceName is ready after $i attempts!"
            return $true
        }
        
        if ($i % 5 -eq 0) {
            Write-Info "Attempt $i/$MaxAttempts - $ServiceName not ready yet..."
        }
        Start-Sleep -Seconds $IntervalSeconds
    }
    Write-Fail "$ServiceName did not start within $($MaxAttempts * $IntervalSeconds) seconds!"
    return $false
}

function Set-CIEnvironment {
    <#
    .SYNOPSIS
        Set environment variables to match CI exactly.
        Reads Firebase keys from .env.local, then overlays CI-specific flags.
    #>

    # Load .env.local for Firebase keys and other secrets
    $envLocal = Read-EnvFile -Path ".env.local"
    foreach ($kv in $envLocal.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, 'Process')
    }

    # Load .env.test for emulator settings
    $envTest = Read-EnvFile -Path ".env.test"
    foreach ($kv in $envTest.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, 'Process')
    }

    # Force CI-specific environment variables (these override anything from .env files)
    $ciVars = @{
        'NEXT_PUBLIC_IS_CI'                   = 'true'
        'NEXT_PUBLIC_USE_FIREBASE_EMULATOR'   = 'true'
        'NEXT_PUBLIC_USE_EMULATOR'            = 'true'
        'NEXT_PUBLIC_E2E'                     = 'true'
        'ALLOW_E2E_SEED'                      = 'true'
        'FIREBASE_AUTH_EMULATOR_HOST'         = '127.0.0.1:9099'
        'FIRESTORE_EMULATOR_HOST'             = '127.0.0.1:8080'
        'FIREBASE_STORAGE_EMULATOR_HOST'      = '127.0.0.1:9199'
        'NODE_ENV'                            = 'test'
    }

    # Align Firebase project IDs (critical for emulator to work)
    $projectId = $envLocal['NEXT_PUBLIC_FIREBASE_PROJECT_ID']
    if (-not $projectId) { $projectId = $envLocal['DO_FIREBASE_PROJECT_ID'] }
    if (-not $projectId) { $projectId = $envTest['DO_FIREBASE_PROJECT_ID'] }
    if (-not $projectId) { $projectId = 'team4job-live' }

    $ciVars['DO_FIREBASE_PROJECT_ID'] = $projectId
    $ciVars['FIREBASE_PROJECT_ID'] = $projectId
    $ciVars['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] = $projectId

    # Also set admin credentials if they exist (for server-side API routes)
    if ($envLocal['DO_FIREBASE_CLIENT_EMAIL']) {
        $ciVars['DO_FIREBASE_CLIENT_EMAIL'] = $envLocal['DO_FIREBASE_CLIENT_EMAIL']
    }
    if ($envLocal['DO_FIREBASE_PRIVATE_KEY']) {
        $ciVars['DO_FIREBASE_PRIVATE_KEY'] = $envLocal['DO_FIREBASE_PRIVATE_KEY']
    }

    foreach ($kv in $ciVars.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, 'Process')
    }

    Write-Ok "Environment configured (Project: $projectId, Emulators: ON)"
}

function Test-Prerequisites {
    <#
    .SYNOPSIS
        Verify all required tools are installed.
    #>
    Write-Step "0" "Checking prerequisites..."
    $allGood = $true

    # Node.js
    try {
        $nodeVersion = (node --version 2>&1).ToString().Trim()
        if ($nodeVersion -match '^v2[0-9]') {
            Write-Ok "Node.js $nodeVersion"
        } else {
            Write-Warn "Node.js $nodeVersion (expected v20.x+)"
        }
    } catch {
        Write-Fail "Node.js is not installed!"
        $allGood = $false
    }

    # Java (required for Firebase Emulators)
    try {
        $javaCheck = java -version 2>&1 | Select-Object -First 1
        if ($javaCheck -match '(2[1-9]|[3-9][0-9])') {
            Write-Ok "Java: $javaCheck"
        } else {
            Write-Warn "Java version may be too old: $javaCheck (need 21+)"
        }
    } catch {
        Write-Fail "Java is not installed! Firebase Emulators require Java 21+."
        $allGood = $false
    }

    # Firebase CLI
    try {
        $fbVersion = firebase --version 2>&1
        Write-Ok "Firebase CLI $fbVersion"
    } catch {
        Write-Fail "Firebase CLI is not installed! Run: npm install -g firebase-tools"
        $allGood = $false
    }

    # Playwright
    try {
        $pwVersion = npx playwright --version 2>&1
        Write-Ok "Playwright $pwVersion"
    } catch {
        Write-Fail "Playwright not found! Run: npx playwright install"
        $allGood = $false
    }

    # .env.local exists
    if (Test-Path ".env.local") {
        Write-Ok ".env.local found"
    } else {
        Write-Fail ".env.local not found! Copy .env.example to .env.local and fill in your keys."
        $allGood = $false
    }

    if (-not $allGood) {
        Write-Fail "Prerequisites check failed. Please fix the issues above."
        exit 1
    }

    Write-Host ""
}

function Invoke-Step {
    <#
    .SYNOPSIS
        Run a named step, record timing and pass/fail.
    #>
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    $stepStart = Get-Date
    Write-Host ""
    Write-Host ">> $Name" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""

    try {
        & $Action
        $exitCode = $LASTEXITCODE
        if ($null -eq $exitCode) { $exitCode = 0 }
    } catch {
        Write-Fail "Exception: $_"
        $exitCode = 1
    }

    $duration = (Get-Date) - $stepStart

    $durStr = '{0:00}:{1:00}' -f [int]$duration.TotalMinutes, $duration.Seconds
    if ($exitCode -eq 0) {
        Write-Ok "$Name - PASSED ($durStr)"
        $script:Results[$Name] = @{ Status = 'PASS'; Duration = $duration; ExitCode = 0 }
    } else {
        $msg = "$Name - FAILED (exit code: $exitCode, duration: $durStr)"
        Write-Fail $msg
        $script:Results[$Name] = @{ Status = 'FAIL'; Duration = $duration; ExitCode = $exitCode }
        $script:ExitCode = 1
    }
}

function Start-Emulators {
    <#
    .SYNOPSIS
        Kill stale processes and start Firebase Emulators in the background.
    #>
    Write-Step "4" "Starting Firebase Emulators (clean state)..."

    # Kill any stale processes on emulator ports
    foreach ($port in @($PORTS.Auth, $PORTS.Firestore, $PORTS.Storage, $PORTS.EmulatorUI)) {
        Stop-ProcessOnPort -Port $port
    }
    Start-Sleep -Seconds 2

    $projectId = $env:DO_FIREBASE_PROJECT_ID
    if (-not $projectId) { $projectId = 'team4job-live' }

    # Start emulators in background
    $emulatorLogFile = Join-Path $PWD "ci-local-emulator.log"
    if (Test-Path $emulatorLogFile) { Remove-Item $emulatorLogFile -Force }

    $script:EmulatorProcess = Start-Process -FilePath "npx.cmd" `
        -ArgumentList "firebase emulators:start --only auth,firestore,storage --project $projectId" `
        -PassThru -NoNewWindow `
        -RedirectStandardOutput $emulatorLogFile `
        -RedirectStandardError (Join-Path $PWD "ci-local-emulator-error.log")

    Write-Info "Emulator PID: $($script:EmulatorProcess.Id)"

    # Wait for emulators to be ready
    $authReady = Wait-ForPort -Url "http://127.0.0.1:$($PORTS.Auth)" -ServiceName "Firebase Auth Emulator" -MaxAttempts 60
    $firestoreReady = Wait-ForPort -Url "http://127.0.0.1:$($PORTS.Firestore)" -ServiceName "Firestore Emulator" -MaxAttempts 60

    if (-not $authReady -or -not $firestoreReady) {
        Write-Fail "Firebase Emulators failed to start!"
        Write-Info "Check ci-local-emulator.log and ci-local-emulator-error.log for details."
        exit 1
    }

    Write-Ok "All Firebase Emulators are running"
}

function Start-NextJsServer {
    <#
    .SYNOPSIS
        Start Next.js production server in the background.
    #>
    Write-Step "5" "Starting Next.js production server..."

    # Kill any stale process on port 3000
    Stop-ProcessOnPort -Port $PORTS.NextJs
    Start-Sleep -Seconds 2

    $serverLogFile = Join-Path $PWD "ci-local-server.log"
    if (Test-Path $serverLogFile) { Remove-Item $serverLogFile -Force }

    $script:NextJsProcess = Start-Process -FilePath "npx.cmd" `
        -ArgumentList "next start -p 3000" `
        -PassThru -NoNewWindow `
        -RedirectStandardOutput $serverLogFile `
        -RedirectStandardError (Join-Path $PWD "ci-local-server-error.log")

    Write-Info "Next.js server PID: $($script:NextJsProcess.Id)"

    $serverReady = Wait-ForPort -Url "http://localhost:3000" -ServiceName "Next.js Production Server" -MaxAttempts 60
    if (-not $serverReady) {
        Write-Fail "Next.js production server failed to start!"
        Write-Info "Check ci-local-server.log for details."
        exit 1
    }
}

function Invoke-SeedTestData {
    <#
    .SYNOPSIS
        Seed test users into Firebase Emulators (mirrors CI seeding).
    #>
    Write-Step "6" "Seeding test data..."
    Write-Info "Running: npx tsx scripts/ci-seed.ts"

    npx tsx scripts/ci-seed.ts 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Test data seeding failed!"
        exit 1
    }
    Write-Ok "Test data seeded successfully"

    # Health check after seeding (mirrors CI)
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:3000/login" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Ok "Server health check passed after seeding"
    } catch {
        Write-Fail "Server crashed after seeding! Possible OOM."
        exit 1
    }
}

function Get-PlaywrightArgs {
    <#
    .SYNOPSIS
        Build the common Playwright CLI arguments (mirrors CI flags).
    #>
    param([string[]]$TestFiles)

    $argsList = @()
    foreach ($file in $TestFiles) {
        $argsList += $file
    }
    $argsList += "--workers=1"
    $argsList += "--retries=$Retries"
    $argsList += "--reporter=list,html"
    if ($Headed) { $argsList += "--headed" }

    return $argsList
}

function Invoke-PlaywrightTest {
    <#
    .SYNOPSIS
        Run Playwright tests with CI-matching configuration.
    #>
    param(
        [string]$Label,
        [string[]]$TestFiles
    )

    $playwrightArgs = Get-PlaywrightArgs -TestFiles $TestFiles
    $fullArgs = @("playwright", "test") + $playwrightArgs
    
    $commandStr = "npx playwright test $($playwrightArgs -join ' ')"
    Write-Info "Command: $commandStr"
    Write-Host ""

    # Set env vars that CI passes to the test runner
    $env:CI = 'true'
    $env:BASE_URL = 'http://127.0.0.1:3000'

    $process = Start-Process -FilePath "npx.cmd" -ArgumentList $fullArgs -NoNewWindow -Wait -PassThru
    $script:ExitCode = $process.ExitCode
    if ($process.ExitCode -ne 0) {
        throw "Playwright test failed with exit code $($process.ExitCode)"
    }
}

function Stop-AllServices {
    <#
    .SYNOPSIS
        Clean up all background processes.
    #>
    if ($KeepRunning) {
        Write-Info "Keeping emulators and server running (-KeepRunning flag set)"
        Write-Info "  Firebase Emulator UI: http://127.0.0.1:4000"
        Write-Info "  Next.js Server:       http://127.0.0.1:3000"
        Write-Info "  To stop later: Stop-Process -Id $($script:EmulatorProcess.Id); Stop-Process -Id $($script:NextJsProcess.Id)"
        return
    }

    Write-Step "CLEANUP" "Stopping all services..."

    # Stop Next.js
    if ($script:NextJsProcess -and -not $script:NextJsProcess.HasExited) {
        Write-Info "Stopping Next.js server (PID: $($script:NextJsProcess.Id))..."
        Stop-Process -Id $script:NextJsProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Stop-ProcessOnPort -Port $PORTS.NextJs

    # Stop Firebase Emulators
    if ($script:EmulatorProcess -and -not $script:EmulatorProcess.HasExited) {
        Write-Info "Stopping Firebase Emulators (PID: $($script:EmulatorProcess.Id))..."
        Stop-Process -Id $script:EmulatorProcess.Id -Force -ErrorAction SilentlyContinue
    }
    foreach ($port in @($PORTS.Auth, $PORTS.Firestore, $PORTS.Storage, $PORTS.EmulatorUI)) {
        Stop-ProcessOnPort -Port $port
    }

    # Kill any orphaned Java processes from emulators
    Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match 'cloud-firestore-emulator|firebase' -or $true
    } | ForEach-Object {
        Write-Info "Killing orphaned Java process (PID: $($_.Id))..."
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }

    Write-Ok "All services stopped"
}

function Write-Summary {
    <#
    .SYNOPSIS
        Print the final summary report (mirrors CI test-summary job).
    #>
    $totalDuration = (Get-Date) - $script:StartTime

    Write-Banner "CI-LOCAL TEST RESULTS SUMMARY"

    $passed = 0
    $failed = 0
    $total = $script:Results.Count

    foreach ($entry in $script:Results.GetEnumerator()) {
        $name = $entry.Key
        $result = $entry.Value
        $dur = '{0:00}:{1:00}' -f [int]$result.Duration.TotalMinutes, $result.Duration.Seconds

        if ($result.Status -eq 'PASS') {
            $passed++
            Write-Host "  [PASS] " -ForegroundColor Green -NoNewline
            Write-Host $name -NoNewline
            Write-Host " ($dur)" -ForegroundColor Gray
        } else {
            $failed++
            $ec = $result.ExitCode
            Write-Host "  [FAIL] " -ForegroundColor Red -NoNewline
            Write-Host $name -NoNewline
            Write-Host " ($dur, exit $ec)" -ForegroundColor Gray
        }
    }

    Write-Host ""
    $summaryLine = "  Total: $total | "
    Write-Host $summaryLine -NoNewline -ForegroundColor White
    $passLine = "Passed: $passed | "
    Write-Host $passLine -NoNewline -ForegroundColor Green
    if ($failed -gt 0) {
        Write-Host "Failed: $failed" -ForegroundColor Red
    } else {
        Write-Host "Failed: $failed" -ForegroundColor Green
    }
    $totalDurStr = '{0:00}:{1:00}:{2:00}' -f [int]$totalDuration.TotalHours, $totalDuration.Minutes, $totalDuration.Seconds
    Write-Host "  Total Duration: $totalDurStr" -ForegroundColor Cyan
    Write-Host ""

    if ($failed -eq 0) {
        Write-Host "  *** ALL TESTS PASSED - SAFE TO PUSH! ***" -ForegroundColor Green -BackgroundColor DarkGreen
    } else {
        Write-Host "  *** $failed SUITE(S) FAILED - DO NOT PUSH! ***" -ForegroundColor White -BackgroundColor DarkRed
    }
    Write-Host ""
    Write-Host "  Playwright Report: playwright-report/index.html" -ForegroundColor Gray
    Write-Host ""
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

try {
    Write-Banner "DoDo Platform - Local CI Pipeline" "Magenta"
    Write-Host "  Suite:       $Suite" -ForegroundColor Gray
    Write-Host "  Group:       $(if ($Group -eq 0) { 'All' } else { $Group })" -ForegroundColor Gray
    Write-Host "  SkipBuild:   $SkipBuild" -ForegroundColor Gray
    Write-Host "  SkipLint:    $SkipLint" -ForegroundColor Gray
    Write-Host "  Headed:      $Headed" -ForegroundColor Gray
    Write-Host "  KeepRunning: $KeepRunning" -ForegroundColor Gray
    Write-Host "  Retries:     $Retries" -ForegroundColor Gray
    if ($TestFile) {
        Write-Host "  TestFile:    $TestFile" -ForegroundColor Gray
    }
    Write-Host ""

    # ── Prerequisites ──
    Test-Prerequisites

    # ── Environment ──
    Write-Step "ENV" "Configuring CI-matching environment variables..."
    Set-CIEnvironment

    # ── Handle -TestFile shortcut ──
    if ($TestFile) {
        Write-Banner "Running Single Test File" "Yellow"

        # Ensure services are running (if not already)
        $needsServices = $true
        try {
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:9099" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            Write-Ok "Emulators and server already running"
            $needsServices = $false
        } catch {
            Write-Info "Services not running, starting them..."
        }

        if ($needsServices) {
            if (-not $SkipBuild) {
                # Quick build check — only build if .next doesn't exist
                if (-not (Test-Path ".next/BUILD_ID")) {
                    Invoke-Step "Production Build" {
                        $env:SKIP_ENV_VALIDATION = 'true'
                        $env:NODE_ENV = 'production'
                        npm run build
                    }
                } else {
                    Write-Ok "Using existing .next build"
                }
            }
            Start-Emulators
            Start-NextJsServer
            Invoke-SeedTestData
        }

        Invoke-Step "Test: $TestFile" {
            Invoke-PlaywrightTest -Label $TestFile -TestFiles @($TestFile)
        }

        Write-Summary
        Stop-AllServices
        exit $script:ExitCode
    }

    # ── Lint-only mode ──
    if ($Suite -eq 'lint') {
        Invoke-Step "ESLint" { npm run lint }
        Invoke-Step "TypeScript Type Check" { npm run typecheck }
        Write-Summary
        exit $script:ExitCode
    }

    # ── Step 1 & 2: Lint + Build (mirrors CI Jobs 1-2) ──
    $needsBuild = (-not $SkipBuild) -and ($Suite -ne 'lint')
    $needsLint = (-not $SkipLint) -and ($Suite -eq 'all' -or $Suite -eq 'lint')

    if ($needsLint) {
        Write-Banner "Step 1: Lint & Type Check" "Blue"
        Invoke-Step "ESLint" { npm run lint }
        Invoke-Step "TypeScript Type Check" { npm run typecheck }
    }

    if ($needsBuild) {
        Write-Banner "Step 2: Production Build" "Blue"
        Invoke-Step "Production Build" {
            $env:SKIP_ENV_VALIDATION = 'true'
            $env:NODE_ENV = 'production'
            npm run build
        }
    } elseif (-not (Test-Path ".next/BUILD_ID") -and $Suite -ne 'lint') {
        Write-Warn "No .next directory found. Running production build..."
        Invoke-Step "Production Build" {
            $env:SKIP_ENV_VALIDATION = 'true'
            $env:NODE_ENV = 'production'
            npm run build
        }
    }

    # ── Check if any build step failed — abort early ──
    $buildFailed = $script:Results.Values | Where-Object { $_.Status -eq 'FAIL' }
    if ($buildFailed) {
        Write-Fail "Build/lint steps failed. Fix errors before running tests."
        Write-Summary
        exit 1
    }

    # ── Step 3-6: Start services (needed for all test suites) ──
    if ($Suite -ne 'lint') {
        # Check if services are already running (for -KeepRunning re-runs)
        $servicesRunning = $false
        try {
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:9099" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            $servicesRunning = $true
            Write-Ok "Emulators and server already running (reusing from previous -KeepRunning)"
        } catch {
            # Not running, need to start
        }

        if (-not $servicesRunning) {
            Write-Banner "Steps 3-6: Starting Services" "Blue"
            Start-Emulators
            Start-NextJsServer
            Invoke-SeedTestData
        } else {
            # Re-seed even if services are running (clean state per CI)
            Write-Step "RESEED" "Re-seeding test data for clean state..."
            Invoke-SeedTestData
        }
    }

    # ── Step 7: Smoke HTTP Tests (mirrors CI Job 3a) ──
    if ($Suite -in @('all', 'full', 'smoke-http')) {
        Write-Banner "Step 7: Smoke HTTP Tests" "Blue"
        Invoke-Step "Smoke HTTP Tests" {
            Invoke-PlaywrightTest -Label "smoke-http" -TestFiles @("tests/e2e/smoke-http.spec.ts")
        }
    }

    # ── Step 8: Smoke Auth Tests (mirrors CI Job 3b — 5 matrix entries) ──
    if ($Suite -in @('all', 'full', 'smoke-auth')) {
        Write-Banner "Step 8: Smoke Auth Tests (5 specs)" "Blue"
        foreach ($authFile in $SMOKE_AUTH_FILES) {
            $testName = [System.IO.Path]::GetFileNameWithoutExtension($authFile) -replace '\.spec$', ''
            Invoke-Step "Smoke Auth: $testName" {
                Invoke-PlaywrightTest -Label $testName -TestFiles @($authFile)
            }
        }
    }

    # ── Step 9: Full E2E Tests (mirrors CI Job 4 — 20 groups) ──
    if ($Suite -in @('all', 'full', 'e2e')) {
        Write-Banner "Step 9: Full E2E Tests" "Blue"

        if ($Group -gt 0) {
            # Run a specific group
            $groupFiles = $E2E_GROUPS[$Group]
            if ($groupFiles) {
                Invoke-Step "E2E Group $Group ($($groupFiles.Count) file(s))" {
                    Invoke-PlaywrightTest -Label "e2e-group-$Group" -TestFiles $groupFiles
                }
            } else {
                Write-Fail "Invalid group number: $Group"
            }
        } else {
            # Run all 20 groups sequentially (mirrors CI but sequential instead of parallel)
            for ($g = 1; $g -le 20; $g++) {
                $groupFiles = $E2E_GROUPS[$g]
                $fileNames = ($groupFiles | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) -replace '\.spec$', '' }) -join ', '
                Invoke-Step "E2E Group $g/20 ($fileNames)" {
                    Invoke-PlaywrightTest -Label "e2e-group-$g" -TestFiles $groupFiles
                }
            }
        }
    }

    # ── Step 10: Edge Case Tests (mirrors CI Job 5) ──
    if ($Suite -in @('all', 'full', 'edge')) {
        Write-Banner "Step 10: Edge Case Tests" "Blue"
        Invoke-Step "Edge Case Tests" {
            Invoke-PlaywrightTest -Label "edge-cases" -TestFiles @("tests/e2e/edge-cases.spec.ts")
        }
    }

    # ── Summary ──
    Write-Summary

} finally {
    # Always clean up, even on Ctrl+C
    Stop-AllServices
}

exit $script:ExitCode
