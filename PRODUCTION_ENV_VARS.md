# Production Environment Variables

These variables must be set in your hosting dashboard (Firebase Console -> App Hosting -> Settings -> Environment Variables OR Vercel -> Settings -> Environment Variables).

## Application Keys
NEXT_PUBLIC_FIREBASE_API_KEY=<your_api_key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your_project_id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your_project_id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your_project_id>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your_app_id>
NEXT_PUBLIC_FIREBASE_VAPID_KEY=<your_vapid_key>

## Maps & AI
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_google_maps_key>
GEMINI_API_KEY=AIzaSyCg6OjGn9jmxzd-hbe8RGJA3vOqlBL8soY

## Server-Side Credentials (NEVER expose these to client)
# Get this from Firebase Console > Project Settings > Service Accounts > Generate New Private Key
# The entire JSON content must be minified into a single line string.
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

## Cashfree Payment Gateway (Marketplace Settlement)
CASHFREE_PAYMENTS_CLIENT_ID=<your_pg_client_id>
CASHFREE_PAYMENTS_CLIENT_SECRET=<your_pg_client_secret>

## Cashfree Payouts (For splitting funds)
CASHFREE_PAYOUTS_CLIENT_ID=<your_payout_client_id>
CASHFREE_PAYOUTS_CLIENT_SECRET=<your_payout_client_secret>

## Cashfree Secure ID (For Installer KYC/Aadhar)
CASHFREE_CLIENT_ID=<your_verification_client_id>
CASHFREE_CLIENT_SECRET=<your_verification_client_secret>
