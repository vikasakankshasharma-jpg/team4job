// infrastructure/firebase/admin.ts

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let appInstance: App | undefined;

/**
 * Initialize and return the Firebase Admin App.
 * Robust implementation with trimming and diagnostics.
 */
export function getAdminApp(): App {
    
    if (appInstance) {
        return appInstance;
    }

    const isE2E = process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NEXT_PUBLIC_E2E_MODE === 'true';
    const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' || 
                       process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
                       (process.env.FIREBASE_AUTH_EMULATOR_HOST !== undefined && process.env.FIREBASE_AUTH_EMULATOR_HOST !== '');


    // Check if the specific named app is already initialized
    const apps = getApps();
    const existingApp = apps.find(a => a.name === (useEmulator ? 'admin-emulator' : 'admin-live'));
    if (existingApp) {
        console.log(`[FirebaseAdmin] Found existing named app (${existingApp.name}) in global context`);
        appInstance = existingApp;
        return appInstance;
    }

    if (useEmulator) {
        console.log('[FirebaseAdmin] INITIALIZING WITH EMULATOR CONFIG (No Cert)');
        const projectId = (process.env.DO_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'team4job-test').trim();
        console.log(`[FirebaseAdmin] Using Project ID: ${projectId}`);
        appInstance = initializeApp({ projectId }, 'admin-emulator');
        return appInstance;
    }

    const projectId = (process.env.DO_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '').trim();
    const clientEmail = (process.env.DO_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const rawPrivateKey = (process.env.DO_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '').trim();

    if (!projectId || !clientEmail || !rawPrivateKey) {
        console.error('[FirebaseAdmin] Missing required credentials in environment variables');
        // Fallback to Application Default Credentials if possible
        try {
            console.log('[FirebaseAdmin] Attempting initialization with Application Default Credentials...');
            appInstance = initializeApp();
            return appInstance;
        } catch (e) {
            throw new Error('Firebase Admin initialization failed: Missing DO_FIREBASE_* credentials.');
        }
    }

    // Extra robust private key processing
    let privateKey = rawPrivateKey;
    
    // Remove wrapping quotes if they exist (sometimes .env values are literal strings)
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    
    // Convert literal \n to real newlines if present
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    console.log(`[FirebaseAdmin] Initializing for project: ${projectId}`);
    console.log(`[FirebaseAdmin] Client Email: ${clientEmail}`);
    console.log(`[FirebaseAdmin] Private Key Length: ${privateKey.length}`);
    console.log(`[FirebaseAdmin] Private Key start: ${privateKey.substring(0, 40)}...`);

    try {
        appInstance = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey,
            }),
            projectId,
            databaseURL: `https://${projectId}.firebaseio.com`
        }, 'admin-live');
        console.log('[FirebaseAdmin] initialization successful');
        return appInstance;
    } catch (error: any) {
        console.error('[FirebaseAdmin] CRITICAL Initialization error:', error.message);
        if (error.message?.includes('16 UNAUTHENTICATED')) {
            console.error('[FirebaseAdmin] AUTH FAILURE: Check if private key or client email is correct.');
        }
        throw error;
    }
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
