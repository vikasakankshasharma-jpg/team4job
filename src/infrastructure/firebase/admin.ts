// infrastructure/firebase/admin.ts

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/infrastructure/logger';

let app: App | undefined;

/**
 * Initialize and return the Firebase Admin App.
 * This function is designed for server-side environments (API routes, server components).
 */
export function getAdminApp(): App {
    if (app) {
        return app;
    }

    // Environment checks removed for Zero-Noise production compliance

    // If an app is already initialized, cache it locally and continue to ensure settings are verified
    if (getApps().length > 0) {
        app = getApps()[0];
    }

    // 0. Emulator-friendly init (priority for local E2E/Dev)
    const useEmulator = 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || 
        process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' ||
        process.env.FIRESTORE_EMULATOR_HOST || 
        process.env.FIREBASE_AUTH_EMULATOR_HOST;

    if (useEmulator) {

        const emulatorProjectId =
            process.env.GCLOUD_PROJECT ||
            process.env.FIREBASE_PROJECT_ID ||
            process.env.DO_FIREBASE_PROJECT_ID ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            'demo-project';

        if (!app) {
            app = initializeApp({
                projectId: emulatorProjectId,
            });
        }

        // Connect to emulators explicitly
        if (process.env.FIRESTORE_EMULATOR_HOST) {
            try {
                const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
                const normalizedHost = host === 'localhost' ? '127.0.0.1' : host;
                getFirestore(app!).settings({
                    host: `${normalizedHost}:${port}`,
                    ssl: false,
                    ignoreUndefinedProperties: true
                });
            } catch (e: any) {
                if (!e.message?.includes('settings() once')) {
                    throw e;
                }
            }
        }

        if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
            // Emulator detected
        }

        return app as App;
    }

    // 1. Try FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) - preferred for production
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountEnv) {
        try {
            if (!app) {
                const serviceAccount = JSON.parse(serviceAccountEnv);
                app = initializeApp({
                    credential: cert(serviceAccount),
                    projectId: serviceAccount.project_id
                });
            }
            return app as App;
        } catch (error) {
            // Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.
        }
    }

    // 2. Fallback to individual environment variables (easier for Vercel/hosting dashboards)
    if (
        process.env.DO_FIREBASE_PROJECT_ID &&
        process.env.DO_FIREBASE_CLIENT_EMAIL &&
        process.env.DO_FIREBASE_PRIVATE_KEY
    ) {
        if (!app) {
            const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Fix escaped newlines
            app = initializeApp({
                credential: cert({
                    projectId: process.env.DO_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
                projectId: process.env.DO_FIREBASE_PROJECT_ID
            });
        }
        return app as App;
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

/**
 * Get the Firebase Admin Storage instance.
 */
export const getAdminStorage = () => getStorage(getAdminApp());
