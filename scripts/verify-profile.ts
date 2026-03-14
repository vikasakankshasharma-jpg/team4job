import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!getApps().length) {
    const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    initializeApp({
        credential: cert({
            projectId: process.env.DO_FIREBASE_PROJECT_ID,
            clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = getFirestore();
const auth = getAuth();

async function verify() {
    const email = 'dualrole@example.com';
    console.log(`🔍 Verifying ${email}...`);

    try {
        const user = await auth.getUserByEmail(email);
        console.log(`✅ Auth User found! UID: ${user.uid}`);

        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            console.log(`✅ Firestore Doc found! Data:`, JSON.stringify(doc.data(), null, 2));
        } else {
            console.log(`❌ Firestore Doc MISSING for UID: ${user.uid}`);
        }
    } catch (e) {
        console.error(`❌ Verification failed:`, e);
    }
}

verify();
