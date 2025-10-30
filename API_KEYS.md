
# Required API Keys for CCTV Job Connect

This document outlines the essential API keys required for the CCTV Job Connect application to function correctly. These keys must be stored in an environment file (e.g., `.env.local`) at the root of the project.

**IMPORTANT NOTE ON CASHFREE PRODUCTS:** For regulatory compliance in India, this marketplace application must use Cashfree's **Marketplace Settlement** feature (also known as "Accounts" or "Easy Split"). This ensures that funds from Job Givers are held in a regulated account managed by Cashfree, not directly in the platform's bank account. You must enable this feature in your Cashfree dashboard. The integration will use the `Payment Gateway` credentials for collecting funds and the `Payouts` credentials for splitting the funds after job completion.

---

## 1. Firebase API Keys

These keys connect the Next.js application to your Firebase project, enabling Authentication, Firestore Database, and other client-side Firebase services.

You can get these from your Firebase project settings:
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project.
3.  Click the gear icon next to "Project Overview" and select **Project settings**.
4.  In the "General" tab, scroll down to the "Your apps" section.
5.  Select your web app and copy the configuration values.

```env
# .env.local

NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="1:your-app-id:web:..."

# This is the VAPID key for Firebase Cloud Messaging (Push Notifications)
# Find this in your Firebase Project Settings -> Cloud Messaging tab -> Web configuration
NEXT_PUBLIC_FIREBASE_VAPID_KEY="your-web-push-certificate-key-pair"
```

---

## 2. Google Maps API Key

This key is required for the interactive map features, including address selection and location-based services.

You can get this from the [Google Cloud Console](https://console.cloud.google.com/):
1.  Go to "APIs & Services" > "Credentials".
2.  Create a new API key or use an existing one.
3.  **Important:** Ensure you have enabled the **Maps JavaScript API**, **Places API**, and **Geocoding API** for this key.
4.  It is highly recommended to restrict this key to your application's domain to prevent unauthorized use.

```env
# .env.local

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSy..."
```

---

## 3. Gemini API Key (for Genkit)

This key enables all the Generative AI features in the application, which are powered by Google's Gemini models through Genkit.

You can get this from [Google AI Studio](https://aistudio.google.com/app/apikey):
1.  Click "Create API key" and follow the instructions.

```env
# .env.local

GEMINI_API_KEY="AIzaSy..."
```

---

## 4. Cashfree API Keys

The application is set up to use three separate products from Cashfree. Each product has its own set of API keys.

**Important:** These keys are secrets and should **NOT** be prefixed with `NEXT_PUBLIC_`. They are used in server-side flows.

### 4.1 Cashfree Verification Suite (Secure ID)

Used for Aadhar verification of Installers during onboarding.
*   **Path:** **Developers > API Keys > Verification Suite**

```env
# .env.local

# For Installer KYC Verification (Aadhar OTP)
CASHFREE_CLIENT_ID="your_verification_suite_client_id"
CASHFREE_CLIENT_SECRET="your_verification_suite_client_secret"
```

### 4.2 Cashfree Payment Gateway

Used to collect payments from Job Givers into the Marketplace Settlement account. The `CLIENT_SECRET` is also used to verify incoming webhooks.
*   **Path:** **Developers > API Keys > Payment Gateway**

```env
# .env.local

# For collecting payments from Job Givers
CASHFREE_PAYMENTS_CLIENT_ID="your_payment_gateway_client_id"
CASHFREE_PAYMENTS_CLIENT_SECRET="your_payment_gateway_client_secret"
```

### 4.3 Cashfree Payouts

Used to disburse funds from the Marketplace Settlement account to the Installer and the platform (as commission).
*   **Path:** **Developers > API Keys > Payouts**

```env
# .env.local

# For sending payouts to Installers
CASHFREE_PAYOUTS_CLIENT_ID="your_payouts_client_id"
CASHFREE_PAYOUTS_CLIENT_SECRET="your_payouts_client_secret"
```
