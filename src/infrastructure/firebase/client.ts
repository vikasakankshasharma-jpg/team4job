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
            // Attempt to initialize with memory cache for CI stability (browserLocalPersistence for Auth, memory for Firestore)
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
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
        console.log('🔴 Connecting to Firebase Emulators...');

        // Connect Auth Emulator
        // Note: No trailing slash for auth URL usually, but let's follow standard port
        connectAuthEmulator(auth, "http://localhost:9099");

        // Connect Firestore Emulator
        connectFirestoreEmulator(db, 'localhost', 8080);

        // Connect Storage Emulator (Optional, but good practice)
        connectStorageEmulator(storage, 'localhost', 9199);

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
