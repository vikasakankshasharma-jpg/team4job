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
            logger.warn('[Firebase Client] Memory cache disabled due to assertion errors, using default');
            db = getFirestoreDefault(app);
        } catch (e) {
            console.error('[Firebase Client] Failed to initialize memory cache, falling back to default:', e);
            db = getFirestoreDefault(app);
        }
    } else {
        logger.info('[Firebase Client] Initializing Firestore with PERSISTENT MULTI-TAB CACHE');
        try {
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
        } catch (e) {
            logger.warn('[Firebase Client] Failed to initialize persistent cache, falling back to default:', { error: e });
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
            logger.info('🔴 [INFRA-CLIENT] Connecting to Firebase Emulators...');
            try {
                connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
                connectFirestoreEmulator(db, '127.0.0.1', 8080);
                connectStorageEmulator(storage, '127.0.0.1', 9199);
                globalObj[EMULATORS_STARTED] = true;
                logger.info('✅ Connected to Firebase Emulators');
            } catch (emuError: any) {
                if (emuError?.code === 'auth/emulator-config-failed') {
                    logger.warn('⚠️ Emulators already connected, ignoring error.');
                    globalObj[EMULATORS_STARTED] = true;
                } else {
                    console.error('Failed to connect to emulators:', emuError);
                }
            }
        }
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
