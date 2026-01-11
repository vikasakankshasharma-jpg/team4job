import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
let envPath = path.resolve(process.cwd(), '.env.local');
const tempEnvPath = path.resolve(process.cwd(), 'temp-env.local');

if (fs.existsSync(tempEnvPath)) {
    console.log('Found temp-env.local, using it directly.');
    envPath = tempEnvPath;
}

console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Map DO_ prefix to standard if missing
if (!process.env.FIREBASE_PRIVATE_KEY && process.env.DO_FIREBASE_PRIVATE_KEY) {
    process.env.FIREBASE_PRIVATE_KEY = process.env.DO_FIREBASE_PRIVATE_KEY;
}
if (!process.env.FIREBASE_PROJECT_ID && process.env.DO_FIREBASE_PROJECT_ID) {
    process.env.FIREBASE_PROJECT_ID = process.env.DO_FIREBASE_PROJECT_ID;
}
if (!process.env.FIREBASE_CLIENT_EMAIL && process.env.DO_FIREBASE_CLIENT_EMAIL) {
    process.env.FIREBASE_CLIENT_EMAIL = process.env.DO_FIREBASE_CLIENT_EMAIL;
}

// Initialize Firebase Admin
if (!getApps().length) {
    try {
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
        if (!privateKeyRaw) {
            throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
        }

        const privateKey = privateKeyRaw.includes('\\n')
            ? privateKeyRaw.replace(/\\n/g, '\n')
            : privateKeyRaw;

        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    } catch (e) {
        console.error('❌ Error initializing Firebase Admin:', e);
        process.exit(1);
    }
}

const db = getFirestore();
const auth = getAuth();

async function inspectUser() {
    try {
        console.log('Inspecting dualrole@example.com...');
        const userRecord = await auth.getUserByEmail('dualrole@example.com');
        console.log(`User UID: ${userRecord.uid}`);

        const docSnap = await db.collection('users').doc(userRecord.uid).get();
        if (docSnap.exists) {
            console.log("Firestore User Data:", JSON.stringify(docSnap.data(), null, 2));
        } else {
            console.log("User document NOT FOUND in Firestore");
        }
    } catch (error) {
        console.error("Error inspecting user:", error);
    }
}

inspectUser();
