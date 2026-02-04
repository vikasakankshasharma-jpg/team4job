
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Helper to get credentials
function getCredential() {
    // 1. Service Account JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
    }
    // 2. Individual Params
    if (process.env.DO_FIREBASE_PROJECT_ID && process.env.DO_FIREBASE_CLIENT_EMAIL && process.env.DO_FIREBASE_PRIVATE_KEY) {
        return cert({
            projectId: process.env.DO_FIREBASE_PROJECT_ID,
            clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.DO_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
    }
    throw new Error('Missing Firebase Credentials in .env.local');
}

if (getApps().length === 0) {
    initializeApp({
        credential: getCredential()
    });
} else {
    getApp();
}

const db = getFirestore();

const FLAGS = {
    'ENABLE_PAYMENTS': { isEnabled: true, description: "Enable real payment processing" },
    'ENABLE_AI_GENERATION': { isEnabled: true, description: "Enable AI description generation" },
    'ENABLE_DISPUTES_V2': { isEnabled: true, description: "Enable new dispute resolution UI" }
};

async function seedFlags() {
    console.log("Seeding Feature Flags...");
    const batch = db.batch();

    for (const [key, value] of Object.entries(FLAGS)) {
        const ref = db.collection('feature_flags').doc(key);
        // Using set with merge to avoid overwriting if already exists / modified
        batch.set(ref, value, { merge: true });
    }

    await batch.commit();
    console.log("Feature Flags seeded successfully.");
}

seedFlags().catch(console.error);
