// lib/firebase/server-init.ts

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App | undefined;

// This function initializes the Firebase Admin SDK.
// It's designed to be used in server-side environments (e.g., API routes, server components).
export function getAdminApp() {
  if (app) return app;

  // If an app is already initialized, return it.
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  // 0. Emulator-friendly init (no credentials required)
  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
  if (useEmulator && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return app;
  }

  // 1. Try to use service-account.json first for local development
  // ... (keeping existing commented code)

  // 2. Fallback to FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) for production
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountEnv) {
    try {
      app = initializeApp({
        credential: cert(JSON.parse(serviceAccountEnv)),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      return app;
    } catch (error) {
      // Parse error
    }
  }

  // 3. Fallback to Individual Environment Variables (Better for Vercel/hosting dashboards)
  if (process.env.DO_FIREBASE_PROJECT_ID && process.env.DO_FIREBASE_CLIENT_EMAIL && process.env.DO_FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Fix escaped newlines
    app = initializeApp({
      credential: cert({
        projectId: process.env.DO_FIREBASE_PROJECT_ID,
        clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return app;
  }

  throw new Error('Failed to initialize Firebase Admin SDK. Missing credentials (FIREBASE_SERVICE_ACCOUNT_KEY or individual vars).');
}

import { getAuth } from 'firebase-admin/auth';
// ... existing imports ...

// ... existing code ...

export const getAdminDb = () => getFirestore(getAdminApp());
export const getAdminAuth = () => getAuth(getAdminApp());
import { getStorage } from 'firebase-admin/storage';
export const getAdminStorage = () => getStorage(getAdminApp());
