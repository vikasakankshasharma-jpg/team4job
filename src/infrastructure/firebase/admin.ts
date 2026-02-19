// infrastructure/firebase/admin.ts

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: App | undefined;

/**
 * Initialize and return the Firebase Admin App.
 * This function is designed for server-side environments (API routes, server components).
 */
export function getAdminApp(): App {
    if (app) return app;

    console.log('[ADMIN-SDK] Initializing Firebase Admin...');
    console.log('[ADMIN-SDK] FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
    console.log('[ADMIN-SDK] FIREBASE_AUTH_EMULATOR_HOST:', process.env.FIREBASE_AUTH_EMULATOR_HOST);

    // If an app is already initialized, return it
    if (getApps().length > 0) {
        console.log('[ADMIN-SDK] Using already initialized app');
        app = getApps()[0];
        return app;
    }

    // 0. Emulator-friendly init (no credentials required)
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        console.log('[ADMIN-SDK] ✓ Using Emulator mode');
        app = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
        });
        console.log('[ADMIN-SDK] App initialized with project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
        return app;
    }

    // 1. Try FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) - preferred for production
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountEnv) {
        try {
            app = initializeApp({
                credential: cert(JSON.parse(serviceAccountEnv)),
            });
            return app;
        } catch (error) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.", error);
        }
    }

    // 2. Fallback to individual environment variables (easier for Vercel/hosting dashboards)
    if (
        process.env.DO_FIREBASE_PROJECT_ID &&
        process.env.DO_FIREBASE_CLIENT_EMAIL &&
        process.env.DO_FIREBASE_PRIVATE_KEY
    ) {
        const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Fix escaped newlines
        app = initializeApp({
            credential: cert({
                projectId: process.env.DO_FIREBASE_PROJECT_ID,
                clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            })
        });
        return app;
    }

    throw new Error(
        'Failed to initialize Firebase Admin SDK. Missing credentials (FIREBASE_SERVICE_ACCOUNT_KEY or individual vars).'
    );
}

/**
 * Get the Firestore Admin database instance.
 */
export const getAdminDb = () => getFirestore(getAdminApp());

/**
 * Get the Firebase Admin Auth instance.
 */
export const getAdminAuth = () => getAuth(getAdminApp());
