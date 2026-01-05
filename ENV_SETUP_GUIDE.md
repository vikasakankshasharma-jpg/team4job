# Environment Variables for Production

## Required Variables

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Firebase (already configured)
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# etc.

## Setup Instructions

### 1. Google Analytics
1. Go to https://analytics.google.com
2. Create a new property for your website
3. Get your Measurement ID (format: G-XXXXXXXXXX)
4. Add to .env.local as NEXT_PUBLIC_GA_ID

### 2. Sentry
1. Go to https://sentry.io
2. Create a new project (Next.js)
3. Get your DSN from project settings
4. Add to .env.local as NEXT_PUBLIC_SENTRY_DSN

### 3. Test the Integration
```bash
# Development
npm run dev

# Check browser console for:
# - Google Analytics: window.gtag should be defined
# - Sentry: Should see Sentry initialization message
```

## Optional: Uptime Monitoring

Consider setting up:
- UptimeRobot (https://uptimerobot.com) - Free tier available
- Pingdom (https://www.pingdom.com)
- Better Uptime (https://betteruptime.com)

Configure alerts to your email/Slack for downtime notifications.
