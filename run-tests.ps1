#!/usr/bin/env pwsh
# Test Execution Script for DoDo Platform
# This script runs all test suites and generates a comprehensive report

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('smoke', 'full', 'edge', 'all')]
    [string]$TestSuite = 'all',
    
    [Parameter(Mandatory=$false)]
    [switch]$Headed,
    
    [Parameter(Mandatory=$false)]
    [switch]$Debug,
    
    [Parameter(Mandatory=$false)]
    [switch]$UI
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DoDo Platform - Test Execution" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if dev server is running
Write-Host "Checking if development server is running..." -ForegroundColor Yellow
$devServerRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    $devServerRunning = $true
    Write-Host "✓ Development server is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Development server is not running" -ForegroundColor Red
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
    
    if ($Debug) {
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
        Write-Host "✓ $Name completed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ $Name failed" -ForegroundColor Red
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
        
        if ($results['Smoke Tests'] -eq 0) {
            $results['Full E2E Tests'] = Run-Tests -Command "npm run test:full" -Name "Full E2E Tests"
            $results['Edge Case Tests'] = Run-Tests -Command "npm run test:edge-cases" -Name "Edge Case Tests"
        } else {
            Write-Host "Skipping remaining tests due to smoke test failure" -ForegroundColor Yellow
        }
    }
}

# Generate summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Execution Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $results.Count
$passedTests = ($results.Values | Where-Object { $_ -eq 0 }).Count
$failedTests = $totalTests - $passedTests

foreach ($test in $results.GetEnumerator()) {
    $status = if ($test.Value -eq 0) { "✓ PASSED" } else { "✗ FAILED" }
    $color = if ($test.Value -eq 0) { "Green" } else { "Red" }
    Write-Host "$($test.Key): " -NoNewline
    Write-Host $status -ForegroundColor $color
}

Write-Host ""
Write-Host "Total: $totalTests | Passed: $passedTests | Failed: $failedTests" -ForegroundColor Cyan
Write-Host ""

# Open report
if (-not $Debug -and -not $UI) {
    Write-Host "Opening test report..." -ForegroundColor Yellow
    npm run test:report
}

# Exit with appropriate code
if ($failedTests -gt 0) {
    exit 1
} else {
    exit 0
}
