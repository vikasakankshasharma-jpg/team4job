
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local', override: true });

function initializeFirebaseAdmin() {
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return initializeApp({ credential: cert(serviceAccount) });
        }
    } catch (e) {
        console.error("Init Error:", e);
    }
    console.error("❌ Failed to initialize Firebase Admin. Check keys.");
    process.exit(1);
}

const app = initializeFirebaseAdmin();
const db = getFirestore(app);
const auth = getAuth(app);

async function restoreAdmin() {
    const email = 'vikasakankshasharma@gmail.com';
    const password = 'Vks2bhdj@9229'; // From user screenshot
    const name = 'Vikas Sharma';

    console.log(`Restoring Admin: ${email}...`);

    let uid;
    try {
        // Try creating user
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
            emailVerified: true
        });
        uid = userRecord.uid;
        console.log(`- Auth user created (UID: ${uid})`);
    } catch (e: any) {
        if (e.code === 'auth/email-already-exists') {
            console.log("- User already exists in Auth, fetching UID...");
            const user = await auth.getUserByEmail(email);
            uid = user.uid;
            // Update password just in case
            await auth.updateUser(uid, { password: password });
            console.log("- Password updated.");
        } else {
            console.error("Auth Error:", e);
            return;
        }
    }

    // Set Admin Role in Custom Claims
    await auth.setCustomUserClaims(uid, { admin: true, role: 'admin' });
    console.log("- Custom Claims set (admin: true)");

    // Create Metadata in Firestore
    await db.collection('users').doc(uid).set({
        id: uid,
        name: name,
        email: email,
        roles: ['Admin', 'Job Giver'], // Give Job Giver too so they can test
        status: 'active',
        memberSince: Timestamp.now(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        isAdmin: true // Redundant but good for client-side quick checks
    }, { merge: true });

    console.log("✅ Admin Restored Successfully!");
}

restoreAdmin().then(() => process.exit(0)).catch(console.error);
