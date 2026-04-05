# Team4Job Alpha Deployment Script (PowerShell)
# This script automates the deployment process to Firebase

Write-Host "🚀 Team4Job Alpha Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build verification
Write-Host "📦 Step 1: Building production bundle..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix errors before deploying." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy Firestore rules (if changed)
Write-Host "🔒 Step 2: Deploying Firestore security rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

Write-Host "✅ Security rules deployed!" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy to Firebase Hosting
Write-Host "🌐 Step 3: Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

Write-Host "✅ Hosting deployment complete!" -ForegroundColor Green
Write-Host ""

# Step 4: Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Your app is now live at:" -ForegroundColor Cyan
Write-Host "   - Primary: https://team4job.com"
Write-Host "   - Firebase: https://team4job-live.web.app"
Write-Host ""
Write-Host "🧪 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Visit https://team4job.com and verify it loads"
Write-Host "   2. Log in as Admin and test key features"
Write-Host "   3. Check /dashboard/audit-logs for functionality"
Write-Host "   4. Send invitations to Alpha testers"
Write-Host ""
Write-Host "📊 Monitor at:" -ForegroundColor Cyan
Write-Host "   - Firebase Console: https://console.firebase.google.com/project/team4job-live"
Write-Host "   - Admin Dashboard: https://team4job.com/dashboard/admin"
Write-Host ""
