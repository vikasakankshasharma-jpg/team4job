
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.error('❌ FIREBASE_PRIVATE_KEY is missing');
    process.exit(1);
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY.includes('\\n')
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : process.env.FIREBASE_PRIVATE_KEY;

initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    }),
});

const auth = getAuth();
const db = getFirestore();

async function deleteInstaller() {
    const email = 'installer@example.com';
    try {
        const user = await auth.getUserByEmail(email);
        console.log(`Deleting Auth User: ${user.uid}`);
        await auth.deleteUser(user.uid);

        console.log(`Deleting Firestore Doc: ${user.uid}`);
        await db.collection('users').doc(user.uid).delete();

        console.log('✅ Installer deleted.');
    } catch (e) {
        console.log('User might not exist:', e);
    }
}

deleteInstaller();
