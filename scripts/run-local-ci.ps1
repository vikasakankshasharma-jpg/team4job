# run-local-ci.ps1
# Runs the local CI mirror using Docker to exactly simulate GitHub Actions constraints

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Starting Local CI Mirror Environment   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Ensure Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# 2. Cleanup previous runs
Write-Host "Cleaning up old containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.ci-mirror.yml down -v --remove-orphans

# 3. Start the test container
Write-Host "Starting constrained container (2 vCPU, 7GB RAM)..." -ForegroundColor Yellow
Write-Host "This will run 'npm ci' and Playwright tests inside the container."
docker-compose -f docker-compose.ci-mirror.yml up --build --abort-on-container-exit

# 4. Check results
$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   SUCCESS: Local CI Mirror Tests Passed! " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "   FAILURE: Local CI Mirror Tests Failed! " -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
}

Write-Host "Test report saved to playwright-report folder." -ForegroundColor Cyan
