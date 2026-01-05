
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { config } from 'dotenv';

config({ path: '.env.local', override: true });

function initializeFirebaseAdmin(): App {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            if (!projectId) throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");

            const app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey
                })
            });
            console.log("Firebase Admin SDK initialized.");
            return app;
        } catch (error) {
            console.error("Error with env vars:", error);
            process.exit(1);
        }
    }
    console.error("Missing env vars.");
    process.exit(1);
}

const firebaseApp = initializeFirebaseAdmin();

const adminDb = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);

async function upgradeUser() {
    const email = 'installer_final@test.com'; // The user we are stuck logged in as
    try {
        const user = await adminAuth.getUserByEmail(email);
        const uid = user.uid;
        console.log(`Found user: ${uid}`);

        await adminDb.collection('users').doc(uid).update({
            roles: ['Installer', 'Job Giver']
        });
        console.log(`Updated roles for ${email} to ['Installer', 'Job Giver']`);

    } catch (e) {
        console.error("Error updating user:", e);
    }
}

upgradeUser().then(() => {
    console.log("Done.");
    process.exit(0);
});
