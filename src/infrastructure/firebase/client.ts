import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import {
    getFirestore,
    Firestore,
    initializeFirestore,
    memoryLocalCache,
    connectFirestoreEmulator
} from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Singleton instances
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

const isClient = typeof window !== 'undefined';

const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';
const appName = isE2E ? 'dodo-e2e-app' : '[DEFAULT]';

const allowProductionEmulators = process.env.NEXT_PUBLIC_ALLOW_PRODUCTION_EMULATORS === 'true';
const shouldUseClientEmulators = false; // Forced false for production testing
// process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' &&
// (process.env.NODE_ENV !== 'production' || allowProductionEmulators);

if (getApps().length > 0 && !isE2E) {
    app = getApp();
} else {
    // For E2E, we always initialize a fresh app instance to avoid cross-test state leakage or locks
    app = initializeApp(firebaseConfig, appName);
}

auth = getAuth(app);
// Persistence is handled by default (browserLocalPersistence) which survives redirects.
// If explicitly needed, we can set it here, but inMemoryPersistence was breaking E2E.

// FORCE MEMORY CACHE
if (isClient) {
    try {
        db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
            ignoreUndefinedProperties: true
        });
    } catch (e) {
        db = getFirestore(app);
    }
} else {
    db = getFirestore(app);
}

storage = getStorage(app);

// --- Emulator Connectivity (Client Side) ---
if (isClient && shouldUseClientEmulators) {
    console.log('[FirebaseClient] Connecting to emulators...');
    // Use hardcoded defaults for E2E speed/stability
    const AUTH_HOST = '127.0.0.1:9099';
    const DB_HOST = '127.0.0.1';
    const STORAGE_HOST = '127.0.0.1';

    try { connectAuthEmulator(auth, `http://${AUTH_HOST}`); } catch(e) {}
    try { connectFirestoreEmulator(db, DB_HOST, 8080); } catch(e) {}
    try { connectStorageEmulator(storage, STORAGE_HOST, 9199); } catch(e) {}
}

export { app, auth, db, storage };
