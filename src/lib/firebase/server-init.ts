// lib/firebase/server-init.ts

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

// This function initializes the Firebase Admin SDK.
// It's designed to be used in server-side environments (e.g., API routes, server components).
function initializeAdminApp() {
  // If an app is already initialized, return it.
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // 1. Try to use service-account.json first for local development
  try {
    const serviceAccount = require('./service-account.json');
    return initializeApp({
        credential: cert(serviceAccount)
    });
  } catch (error: any) {
    if (error.code !== 'MODULE_NOT_FOUND') {
        console.error("Error reading or parsing service-account.json:", error);
        throw new Error("Could not initialize Firebase Admin SDK. The service-account.json file may be corrupted.");
    }
    // If the file is not found, proceed to check environment variable.
  }

  // 2. Fallback to environment variable for production/deployment
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountEnv) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set, and service-account.json was not found. This is required for server-side Firebase operations.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it's a valid JSON string.", error);
    throw new Error("Firebase Admin SDK initialization failed.");
  }
}

app = initializeAdminApp();

export const db = getFirestore(app);
export const adminApp = app;
