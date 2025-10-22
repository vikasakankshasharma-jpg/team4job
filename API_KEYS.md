# Required API Keys for CCTV Job Connect

This document outlines the essential API keys required for the CCTV Job Connect application to function correctly. These keys must be stored in an environment file (e.g., `.env.local`) at the root of the project.

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

These keys are essential for the KYC verification flow (Aadhar verification) and for processing payments between Job Givers and Installers. The application is set up to work with Cashfree's services.

You can get these from your Cashfree merchant dashboard after signing up.

**Note:** These keys are secrets and should **NOT** be prefixed with `NEXT_PUBLIC_`. They are used in server-side Genkit flows.

```env
# .env.local

CASHFREE_CLIENT_ID="your_cashfree_client_id"
CASHFREE_CLIENT_SECRET="your_cashfree_client_secret"
```
