import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import {
    getFirestore,
    initializeFirestore,
    memoryLocalCache,
    persistentLocalCache,
    persistentMultipleTabManager,
    getFirestore as getFirestoreDefault,
    connectFirestoreEmulator
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { logger } from '@/infrastructure/logger';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-key',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '00000000000',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:00000000000:web:0000000000000000000000',
};

const EMULATORS_STARTED = '__do_firebase_emulators_started__';

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

            db = getFirestoreDefault(app);
            db = getFirestoreDefault(app);
        } catch (e) {
            db = getFirestoreDefault(app);
        }
    } else {

        try {
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
        } catch (e) {

            db = getFirestoreDefault(app);
        }
    }

    storage = getStorage(app);

    // Emulator Connection Logic
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'ssr';
    const isActualLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const isStaging = currentHost.includes('dodo-beta');
    const emulatorFlag = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

    if (emulatorFlag && isActualLocalhost && !isStaging) {
        const globalObj = typeof window !== 'undefined' ? (window as any) : globalThis;
        if (!globalObj[EMULATORS_STARTED]) {

            try {
                connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
                connectFirestoreEmulator(db, '127.0.0.1', 8080);
                connectStorageEmulator(storage, '127.0.0.1', 9199);
                globalObj[EMULATORS_STARTED] = true;

            } catch (emuError: any) {
                if (emuError?.code === 'auth/emulator-config-failed') {

                    globalObj[EMULATORS_STARTED] = true;
                }
            }
        }
    }

    // CI Specific Persistence Overrides
    if (process.env.NEXT_PUBLIC_IS_CI === 'true') {
        setPersistence(auth, browserLocalPersistence).catch(() => {});
    }

} catch (error) {
    const mockApp = { name: '[DEFAULT]', options: firebaseConfig, automaticDataCollectionEnabled: false };
    app = mockApp;
    auth = { app: mockApp } as any;
    db = { app: mockApp } as any;
    storage = { app: mockApp } as any;
}

export { app, auth, db, storage };
