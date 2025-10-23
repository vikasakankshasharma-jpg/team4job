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

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountEnv) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for server-side Firebase operations.');
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
