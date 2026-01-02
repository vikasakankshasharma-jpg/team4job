
# scripts/sync-secrets.ps1
# Automates uploading secrets from .env.local to GitHub Actions
# Falls back to printing secrets if 'gh' CLI is not available.

$envFile = ".env.local"
if (-not (Test-Path $envFile)) { 
    Write-Error "$envFile not found!"
    exit 1 
}

$ghCmd = "gh"
if (Get-Command gh -ErrorAction SilentlyContinue) {
    $ghInstalled = $true
}
elseif (Test-Path "C:\Program Files\GitHub CLI\gh.exe") {
    $ghInstalled = $true
    $ghCmd = "& 'C:\Program Files\GitHub CLI\gh.exe'"
    Write-Host "Found GitHub CLI at default location." -ForegroundColor Cyan
}
else {
    $ghInstalled = $false
}

if (-not $ghInstalled) {
    Write-Warning "GitHub CLI ('gh') not found in PATH or default location."
    Write-Warning "Running in FALLBACK MODE: Printing secrets to console."
    Write-Host "Please manually add these to: Settings -> Secrets and variables -> Actions" -ForegroundColor Cyan
    Write-Host "---------------------------------------------------" -ForegroundColor Cyan
}
else {
    Write-Host "Found GitHub CLI. Attempting to sync secrets..." -ForegroundColor Green
    
    # Try to login if listed as not logged in (basic check, might fail if interactive)
    Write-Host "Checking auth status..."
    Invoke-Expression "$ghCmd auth status" 
}

# Read file line by line
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            
            # Filter for keys we care about
            if ($key -match "NEXT_PUBLIC_FIREBASE" -or $key -match "NEXT_PUBLIC_GOOGLE_MAPS" -or $key -match "CASHFREE" -or $key -match "SENTRY") {
                
                if ($ghInstalled) {
                    Write-Host "Syncing secret: $key"
                    # Use the resolved command string
                    $expression = "echo $value | $ghCmd secret set $key"
                    Invoke-Expression $expression
                }
                else {
                    Write-Host "$key" -ForegroundColor Yellow
                    Write-Host "$value"
                    Write-Host "---------------------------------------------------" -ForegroundColor Cyan
                }
            }
        }
    }
}

Write-Host "Operation complete!" -ForegroundColor Green
