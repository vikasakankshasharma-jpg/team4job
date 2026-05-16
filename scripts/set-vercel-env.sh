#!/usr/bin/env bash
# Script to set all missing/updated Vercel env vars for production

set -e

echo "Setting production environment variables..."

# Firebase Project ID for Admin SDK
echo "team4job-live" | vercel env add DO_FIREBASE_PROJECT_ID production --force 2>/dev/null || \
  vercel env rm DO_FIREBASE_PROJECT_ID production --yes 2>/dev/null ; echo "team4job-live" | vercel env add DO_FIREBASE_PROJECT_ID production

# Firebase Admin Client Email  
echo "firebase-adminsdk-fbsvc@team4job-live.iam.gserviceaccount.com" | vercel env add DO_FIREBASE_CLIENT_EMAIL production --force 2>/dev/null || true

# Google Maps API Key
echo "AIzaSyAhKb0H_hwdg32gkS08GR3sFD9qi_bHvSY" | vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production --force 2>/dev/null || true

# Gemini AI Keys
echo "AIzaSyAPZYz5SY2sefNo9Zocra23sR-wbfZ4doo" | vercel env add NEXT_PUBLIC_GEMINI_API_KEY production --force 2>/dev/null || true
echo "AIzaSyAPZYz5SY2sefNo9Zocra23sR-wbfZ4doo" | vercel env add GEMINI_API_KEY production --force 2>/dev/null || true
echo "AIzaSyAPZYz5SY2sefNo9Zocra23sR-wbfZ4doo" | vercel env add GOOGLE_GENAI_API_KEY production --force 2>/dev/null || true
echo "AIzaSyAPZYz5SY2sefNo9Zocra23sR-wbfZ4doo" | vercel env add GOOGLE_API_KEY production --force 2>/dev/null || true

# Google Analytics
echo "G-B46YNTH6E2" | vercel env add NEXT_PUBLIC_GA_ID production --force 2>/dev/null || true

# Emulator flags — MUST be false for production
echo "false" | vercel env add NEXT_PUBLIC_USE_EMULATOR production --force 2>/dev/null || true
echo "false" | vercel env add NEXT_PUBLIC_USE_FIREBASE_EMULATOR production --force 2>/dev/null || true
echo "false" | vercel env add NEXT_PUBLIC_E2E production --force 2>/dev/null || true
echo "false" | vercel env add NEXT_PUBLIC_E2E_MODE production --force 2>/dev/null || true

# Node env
echo "production" | vercel env add NODE_ENV production --force 2>/dev/null || true

echo "Done! All env vars configured."
