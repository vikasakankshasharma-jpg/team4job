#!/bin/bash

# Team4Job Alpha Deployment Script
# This script automates the deployment process to Firebase

set -e  # Exit on any error

echo "🚀 Team4Job Alpha Deployment"
echo "================================"
echo ""

# Step 1: Build verification
echo "📦 Step 1: Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Deploy Firestore rules (if changed)
echo "🔒 Step 2: Deploying Firestore security rules..."
firebase deploy --only firestore:rules

echo "✅ Security rules deployed!"
echo ""

# Step 3: Deploy to Firebase Hosting
echo "🌐 Step 3: Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Hosting deployment complete!"
echo ""

# Step 4: Summary
echo "================================"
echo "🎉 Deployment Complete!"
echo ""
echo "📍 Your app is now live at:"
echo "   - Primary: https://team4job.com"
echo "   - Firebase: https://team4job-live.web.app"
echo ""
echo "🧪 Next Steps:"
echo "   1. Visit https://team4job.com and verify it loads"
echo "   2. Log in as Admin and test key features"
echo "   3. Check /dashboard/audit-logs for functionality"
echo "   4. Send invitations to Alpha testers"
echo ""
echo "📊 Monitor at:"
echo "   - Firebase Console: https://console.firebase.google.com/project/team4job-live"
echo "   - Admin Dashboard: https://team4job.com/dashboard/admin"
echo ""
