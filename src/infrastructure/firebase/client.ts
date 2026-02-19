import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache, getFirestore as getFirestoreDefault, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-key',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '00000000000',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:00000000000:web:0000000000000000000000',
};

// Initialize Firebase
let app: any;
let auth: any;
let db: any;
let storage: any;

try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

    auth = getAuth(app);

    // Initialization logic for Firestore to support custom cache settings
    const useMemoryCache =
        process.env.NEXT_PUBLIC_IS_CI === 'true' ||
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
        process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

    if (useMemoryCache) {
        try {
            // Use memory cache to avoid IndexedDB flakiness in CI/emulator environments
            console.log('[Firebase Client] Initializing Firestore with MEMORY CACHE (CI/emulator mode)');
            db = initializeFirestore(app, {
                localCache: memoryLocalCache(),
                experimentalForceLongPolling: true
            });
        } catch (e) {
            console.error('[Firebase Client] Failed to initialize memory cache, falling back to default:', e);
            // Fallback if already initialized
            db = getFirestoreDefault(app);
        }
    } else {
        console.log('[Firebase Client] Initializing Firestore with DEFAULT PERSISTENCE');
        db = getFirestoreDefault(app);
    }

    storage = getStorage(app);

    // Emulator Connection Logic
    console.log('[DEBUG] Env Check:', {
        NODE_ENV: process.env.NODE_ENV,
        USE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
        USE_EMULATOR_LEGACY: process.env.NEXT_PUBLIC_USE_EMULATOR
    });

    // HYPER-STRICT GUARD: Only connect to emulators on localhost and when explicitly enabled
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'ssr';
    const isActualLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const isStaging = currentHost.includes('dodo-beta');
    const emulatorFlag = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

    console.log('[DEBUG-INFRA] Host Check:', { currentHost, isActualLocalhost, isStaging, emulatorFlag });

    if (emulatorFlag && isActualLocalhost && !isStaging) {
        console.log('🔴 [INFRA-CLIENT] Connecting to Firebase Emulators...');

        // Connect Auth Emulator
        // Note: No trailing slash for auth URL usually, but let's follow standard port
        connectAuthEmulator(auth, "http://127.0.0.1:9099");

        // Connect Firestore Emulator
        connectFirestoreEmulator(db, '127.0.0.1', 8080);

        // Connect Storage Emulator (Optional, but good practice)
        connectStorageEmulator(storage, '127.0.0.1', 9199);

        console.log('✅ Connected to Firebase Emulators');
    }

    // CI Specific Persistence Overrides
    if (process.env.NEXT_PUBLIC_IS_CI === 'true') {
        // Use browserLocalPersistence (localStorage) instead of IndexedDB to avoid flakes
        setPersistence(auth, browserLocalPersistence).catch(console.warn);
    }

} catch (error) {
    console.warn("Firebase initialization skipped (expected during build/CI):", error);
    const mockApp = { name: '[DEFAULT]', options: firebaseConfig, automaticDataCollectionEnabled: false };
    app = mockApp;
    auth = { app: mockApp } as any;
    db = { app: mockApp } as any;
    storage = { app: mockApp } as any;
}

export { app, auth, db, storage };
