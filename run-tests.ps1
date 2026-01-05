#!/usr/bin/env pwsh
# Test Execution Script for DoDo Platform
# This script runs all test suites and generates a comprehensive report

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('smoke', 'full', 'edge', 'all')]
    [string]$TestSuite = 'all',
    
    [Parameter(Mandatory = $false)]
    [switch]$Headed,
    
    [Parameter(Mandatory = $false)]
    [switch]$DebugMode,
    
    [Parameter(Mandatory = $false)]
    [switch]$UI
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DoDo Platform - Test Execution" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if dev server is running
$maxRetries = 10
$retryCount = 0
$devServerRunning = $false

do {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $devServerRunning = $true
            Write-Host "[OK] Development server is running" -ForegroundColor Green
            break
        }
    }
    catch {
        # Ignore error
    }
    
    if (-not $devServerRunning) {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "Waiting for development server... ($retryCount/$maxRetries)" -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
} until ($devServerRunning -or $retryCount -ge $maxRetries)

if (-not $devServerRunning) {
    Write-Host "[FAIL] Development server is not running" -ForegroundColor Red
    Write-Host "  Please start the dev server with: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Function to run tests
function Run-Tests {
    param(
        [string]$Command,
        [string]$Name
    )
    
    Write-Host "Running $Name..." -ForegroundColor Cyan
    Write-Host "Command: $Command" -ForegroundColor Gray
    Write-Host ""
    
    $startTime = Get-Date
    
    if ($Headed) {
        $Command += " --headed"
    }
    
    if ($DebugMode) {
        $Command += " --debug"
    }
    
    if ($UI) {
        $Command += " --ui"
    }
    
    Invoke-Expression $Command
    $exitCode = $LASTEXITCODE
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "[PASS] $Name completed successfully" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $Name failed" -ForegroundColor Red
    }
    Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Gray
    Write-Host ""
    
    return $exitCode
}

# Track results
$results = @{}

# Run tests based on suite selection
switch ($TestSuite) {
    'smoke' {
        $results['Smoke Tests'] = Run-Tests -Command "npm run test:smoke" -Name "Smoke Tests"
    }
    'full' {
        $results['Full E2E Tests'] = Run-Tests -Command "npm run test:full" -Name "Full E2E Tests"
    }
    'edge' {
        $results['Edge Case Tests'] = Run-Tests -Command "npm run test:edge-cases" -Name "Edge Case Tests"
    }
    'all' {
        $results['Smoke Tests'] = Run-Tests -Command "npm run test:smoke" -Name "Smoke Tests"
        
        # Run everything regardless of smoke test failure as per user request for manual full run,
        # but typically we stop. However, to match 'run full test' which implies running all parts,
        # I will change logic to run subsequent tests even if smoke fails, 
        # BUT standard practice is to stop. The user said "run full test: smoke, e2e, edge"
        # I'll stick to running sequentially but continuing on failure might be better for reporting all at once?
        # The original script stopped. Let's keep it safe. 
        # Actually, let's allow continuing so the user sees everything.
        
        $results['Full E2E Tests'] = Run-Tests -Command "npm run test:full" -Name "Full E2E Tests"
        $results['Edge Case Tests'] = Run-Tests -Command "npm run test:edge-cases" -Name "Edge Case Tests"
    }
}

# Generate summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Execution Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $results.Count
$passedTests = 0
foreach ($v in $results.Values) { if ($v -eq 0) { $passedTests++ } }
$failedTests = $totalTests - $passedTests

foreach ($key in $results.Keys) {
    $val = $results[$key]
    if ($val -eq 0) {
        $status = "[PASS]"
        $color = "Green"
    }
    else {
        $status = "[FAIL]"
        $color = "Red"
    }
    Write-Host "$key : " -NoNewline
    Write-Host $status -ForegroundColor $color
}

Write-Host ""
Write-Host "Total: $totalTests | Passed: $passedTests | Failed: $failedTests" -ForegroundColor Cyan
Write-Host ""

# Open report
if (-not $DebugMode -and -not $UI) {
    Write-Host "Opening test report..." -ForegroundColor Yellow
    # npm run test:report
}

# Exit with appropriate code
if ($failedTests -gt 0) {
    exit 1
}
else {
    exit 0
}
