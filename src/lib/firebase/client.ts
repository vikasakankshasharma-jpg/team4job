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
    if (process.env.NEXT_PUBLIC_IS_CI === 'true') {
        try {
            db = initializeFirestore(app, { localCache: memoryLocalCache() });
        } catch (e) {
            db = getFirestoreDefault(app);
        }
    } else {
        db = getFirestoreDefault(app);
    }

    storage = getStorage(app);

    // HYPER-STRICT GUARD: Only connect to emulators on localhost and when explicitly enabled
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'ssr';
    const isActualLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const isStaging = currentHost.includes('dodo-beta');
    const emulatorFlag = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

    console.log('[DEBUG-LIB] Host Check:', { currentHost, isActualLocalhost, isStaging, emulatorFlag });

    if (emulatorFlag && isActualLocalhost && !isStaging) {
        console.log('[LIB-CLIENT] Connecting to Emulators...');

        // Auth Emulator (Port 9099)
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

        // Firestore Emulator (Port 8080)
        connectFirestoreEmulator(db, '127.0.0.1', 8080);

        // Storage Emulator (Port 9199 - Default)
        connectStorageEmulator(storage, '127.0.0.1', 9199);
    }

    // CI Specific Persistence Overrides
    if (process.env.NEXT_PUBLIC_IS_CI === 'true') {
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
