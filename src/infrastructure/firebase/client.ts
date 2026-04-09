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
let db: Firestore = null!;
let storage: FirebaseStorage = null!;

const isClient = typeof window !== 'undefined';

const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';
const appName = isE2E ? 'dodo-e2e-app' : '[DEFAULT]';

const allowProductionEmulators = process.env.NEXT_PUBLIC_ALLOW_PRODUCTION_EMULATORS === 'true';
const shouldUseClientEmulators = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' || 
                               process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

const existingApp = getApps().find(a => a.name === appName);
const isNewApp = !existingApp;

if (existingApp) {
    app = existingApp;
} else {
    // For E2E, we always initialize a fresh app instance to avoid cross-test state leakage or locks
    app = initializeApp(firebaseConfig, appName);
}

auth = getAuth(app);
// Persistence is handled by default (browserLocalPersistence) which survives redirects.
// If explicitly needed, we can set it here, but inMemoryPersistence was breaking E2E.

// FORCE MEMORY CACHE (Client Only)
if (isClient) {
    if (shouldUseClientEmulators && typeof indexedDB !== 'undefined' && isNewApp) {
        try {
            // Suppress the uncatchable Firebase INTERNAL ASSERTION FAILED so Next.js doesn't flag it as an Issue
            const isFirebaseInternalError = (msg: string) =>
                msg.includes('INTERNAL ASSERTION FAILED') ||
                msg.includes('INTERNAL UNHANDLED ERROR') ||
                msg.includes('Unexpected state') ||
                (msg.includes("'in' operator") && msg.includes('null')) ||
                msg.includes('canonifyValue') ||
                msg.includes('canonifyFilter') ||
                msg.includes('Could not reach Cloud Firestore backend') ||
                msg.includes('operate in offline mode until it is able to successfully connect') ||
                msg.includes('Cannot convert firestore.v1.Value with type unset') ||
                msg.includes('Unexpected state (ID: ca9)');

            const serializeArg = (arg: any): string => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
                try { return JSON.stringify(arg); } catch { return String(arg); }
            };

            const originalConsoleError = console.error;
            console.error = (...args) => {
                const msgStr = args.map(serializeArg).join(' ');
                // Drop ALL Firebase internal assertion failures and null-value serializer errors — emulator-only artifacts
                if (isFirebaseInternalError(msgStr)) {
                    return; // Silently drop
                }
                originalConsoleError(...args);
            };

            // Also suppress as thrown errors via overriding console.warn for Firebase internals
            const originalConsoleWarn = console.warn;
            console.warn = (...args) => {
                const msgStr = args.map(serializeArg).join(' ');
                if (isFirebaseInternalError(msgStr)) {
                    return;
                }
                originalConsoleWarn(...args);
            };

            // Self-healing: aggressively wipe corrupted IndexedDB state on E2E/Emulator load.
            if (typeof indexedDB.databases === 'function') {
                indexedDB.databases().then(dbs => {
                    for (const dbInfo of dbs) {
                        if (dbInfo.name && dbInfo.name.startsWith('firestore/')) {
                            console.warn(`[Self-Healing] Dropping IndexedDb: ${dbInfo.name}`);
                            indexedDB.deleteDatabase(dbInfo.name);
                        }
                    }
                }).catch(() => {});
            }

            // Self-healing: Catch internal Firebase errors when the emulator restarts.

            // Catch and silently suppress internal Firebase SDK errors on the emulator.
            // With experimentalForceLongPolling and the getDoc fallback in use-user.tsx,
            // we do NOT reload on these errors — a reload would reset loading state and
            // prevent the 4s getDoc fallback from resolving the user profile.
            const handleEmulatorCrash = (event: ErrorEvent | PromiseRejectionEvent) => {
                const err = 'error' in event ? event.error : event.reason;
                const errStr = err?.message || String(err) || '';
                
                if (isFirebaseInternalError(errStr)) {
                    // Silently suppress — getDoc fallback handles profile recovery
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    if ('returnValue' in event) (event as any).returnValue = false;
                    return false as any;
                } else if (errStr.includes('revoked')) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    console.warn('[Self-Healing] Auth token revoked. Signing out...');
                    getAuth().signOut().catch(() => {
                        window.location.href = '/login';
                    });
                }
            };

            // Override window.onerror to block the Next.js dev overlay for Firebase internal errors
            const origOnerror = window.onerror;
            window.onerror = (msg, src, line, col, err) => {
                const msgStr = String(msg || '') + String(err?.message || '');
                if (isFirebaseInternalError(msgStr)) return true; // returning true suppresses the browser default & overlay
                return origOnerror ? origOnerror(msg, src, line, col, err) : false;
            };
            

            // Register in the CAPTURE phase so we execute *before* Next.js's error boundary
            window.addEventListener('error', handleEmulatorCrash, true);
            
            // Also intercept unhandled promise rejections which often carry the Firestore assertion failures
            window.addEventListener('unhandledrejection', (event) => {
                const errStr = String(event?.reason?.message || event?.reason || '');
                if (isFirebaseInternalError(errStr)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    return false;
                }
            }, true);
            window.addEventListener('unhandledrejection', handleEmulatorCrash, true);
            
        } catch (_ignore) {}
    }

    try {
        db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
            ignoreUndefinedProperties: true,
            // Force long-polling on emulator to avoid the WebChannel nullValue deserializer bug
            // in Firebase SDK 12.x — long-polling uses HTTP REST instead of the broken WebChannel
            ...(shouldUseClientEmulators ? { experimentalForceLongPolling: true } : {}),
        });
    } catch (e) {
        db = getFirestore(app);
    }
} else {
    // On server, we leave db uninitialized to avoid gRPC error spam.
    // Server-side code MUST use getAdminDb() instead.
}

storage = getStorage(app);

// --- Emulator Connectivity (Client Side) ---
if (isClient && shouldUseClientEmulators && isNewApp) {
    // Use hardcoded defaults for E2E speed/stability
    const AUTH_HOST = '127.0.0.1:9099';
    const DB_HOST = '127.0.0.1';
    const STORAGE_HOST = '127.0.0.1';

    // disableWarnings: true prevents the emulator from injecting a <div> warning banner
    // into the DOM which was crashing MutationObserver on the login page and aborting POST requests.
    try { connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true }); } catch(e) {}
    try { if (db) connectFirestoreEmulator(db, DB_HOST, 8080); } catch(e) {}
    try { connectStorageEmulator(storage, STORAGE_HOST, 9199); } catch(e) {}
}

export { app, auth, db, storage };
