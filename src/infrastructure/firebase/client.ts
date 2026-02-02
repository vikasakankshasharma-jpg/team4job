import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache, connectFirestoreEmulator, getFirestore as getFirestoreDefault } from 'firebase/firestore';
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
            // Attempt to initialize with memory cache for CI stability
            db = initializeFirestore(app, { localCache: memoryLocalCache() });
        } catch (e) {
            // Fallback if already initialized
            db = getFirestoreDefault(app);
        }
    } else {
        db = getFirestoreDefault(app);
    }

    storage = getStorage(app);

    // Emulator Connection Logic
    // We strictly use emulators in CI and Development
    const useEmulator = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_IS_CI === 'true';

    if (useEmulator) {
        // Connect Auth Emulator
        try {
            connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        } catch (e) {
            // Ignore "emulator already connected"
        }

        // Connect Firestore Emulator
        try {
            connectFirestoreEmulator(db, '127.0.0.1', 8080);
        } catch (e) { }

        // Connect Storage Emulator
        try {
            connectStorageEmulator(storage, '127.0.0.1', 9199);
        } catch (e) { }
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
