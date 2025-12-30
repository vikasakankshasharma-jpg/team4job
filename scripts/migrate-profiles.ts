
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.production', override: true });

let firebaseAppInit: App | undefined;

function initializeFirebaseAdmin(): App {
    // 1. Try environment variable first (CI/CD friendly)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            return initializeApp({
                credential: cert(serviceAccount)
            }, 'migration-app'); // Valid usage
        } catch (error) {
            console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error);
        }
    }

    // 2. Try service-account.json
    try {
        const serviceAccount = require('../src/lib/firebase/service-account.json');
        return initializeApp({
            credential: cert(serviceAccount)
        }, 'migration-app');
    } catch (error: any) {
        // Ignore module not found
    }

    // 3. Try separate env vars
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        try {
            return initializeApp({
                credential: cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            }, 'migration-app');
        } catch (e) {
            console.error("Failed to init with separate vars", e);
        }
    }

    console.error("Failed to initialize Firebase Admin. Please check your .env or service account.");
    process.exit(1);
    // Unreachable but keeping TS happy
    throw new Error("Failed to initialize");
}

const firebaseApp = initializeFirebaseAdmin();
const db = getFirestore(firebaseApp);

async function migrateProfiles() {
    console.log("Starting Profile Migration...");
    const usersSnap = await db.collection('users').get();

    if (usersSnap.empty) {
        console.log("No users found to migrate.");
        return;
    }

    console.log(`Found ${usersSnap.size} users. Processing...`);
    const batch = db.batch();
    let count = 0;

    for (const doc of usersSnap.docs) {
        const userData = doc.data();
        const publicProfileRef = db.collection('public_profiles').doc(doc.id);

        const publicData = {
            id: doc.id,
            name: userData.name || 'Unknown User',
            avatarUrl: userData.avatarUrl || '',
            realAvatarUrl: userData.realAvatarUrl || userData.avatarUrl || '',
            roles: userData.roles || [],
            memberSince: userData.memberSince,
            status: userData.status,
            pincodes: userData.pincodes || {},
            address: {
                cityPincode: userData.address?.cityPincode || '',
                // precise address fields excluded for privacy
            },
            // Installer Specific
            installerProfile: userData.installerProfile || null,
            district: userData.district || null,
            // We strip PII like mobile, email, address, pan, etc.
        };

        batch.set(publicProfileRef, publicData, { merge: true });
        count++;
    }

    await batch.commit();
    console.log(`Successfully migrated ${count} users to 'public_profiles'.`);
}

migrateProfiles().catch(console.error);
