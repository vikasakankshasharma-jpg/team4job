import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Initialize Firebase Admin
// Try to find service account or use env vars
let serviceAccount;
try {
    const saPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
    if (fs.existsSync(saPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    }
} catch (e) { }

if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

if (!serviceAccount) {
    console.error("No service account found. Cannot verify admin.");
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function checkAdmin() {
    console.log("Checking admin user...");
    const email = 'admin@team4job.com';

    try {
        const userRecord = await auth.getUserByEmail(email);
        console.log(`Auth User Found: ${userRecord.uid}`);

        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (!userDoc.exists) {
            console.error("User document does NOT exist in Firestore!");
            // Create minimal user doc if missing
            await db.collection('users').doc(userRecord.uid).set({
                email: email,
                roles: ['Admin'],
                status: 'active',
                createdAt: FieldValue.serverTimestamp()
            });
            console.log("Created missing user document with Admin role.");
        } else {
            console.log("User Data:", JSON.stringify(userDoc.data(), null, 2));
            const roles = userDoc.data().roles;
            if (!roles || !roles.includes('Admin')) {
                console.error("User does NOT have Admin role!");
                // Attempt to fix
                await db.collection('users').doc(userRecord.uid).update({
                    roles: FieldValue.arrayUnion('Admin')
                });
                console.log("Added Admin role to user.");
            } else {
                console.log("User HAS Admin role.");
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

checkAdmin();
