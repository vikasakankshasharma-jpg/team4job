
import { config } from 'dotenv';
const result = config({ path: '.env.local' });
if (result.error) console.error("Dotenv error:", result.error);

async function seedAdmin() {
    // Dynamic import to ensure env vars are loaded first
    const { db } = await import('../src/lib/firebase/server-init');
    const { getAuth } = await import('firebase-admin/auth');
    const { Timestamp } = await import('firebase-admin/firestore');

    const adminEmail = 'admin@team4job.com';
    const password = 'Test@1234';
    const auth = getAuth();

    try {
        let uid;
        try {
            const userRecord = await auth.getUserByEmail(adminEmail);
            uid = userRecord.uid;
            console.log(`Admin user already exists: ${uid}`);
            await auth.updateUser(uid, { password });
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                const userRecord = await auth.createUser({
                    email: adminEmail,
                    password: password,
                    displayName: 'Admin User',
                    emailVerified: true
                });
                uid = userRecord.uid;
                console.log(`Created Admin user: ${uid}`);
            } else {
                throw e;
            }
        }

        if (!uid) throw new Error("Failed to get UID");

        // Seed Firestore
        const userRef = db.collection('users').doc(uid);
        const publicProfileRef = db.collection('public_profiles').doc(uid);

        const userData = {
            id: uid,
            name: 'Admin User',
            email: adminEmail,
            roles: ['Admin'],
            status: 'active',
            memberSince: Timestamp.now(),
            isMobileVerified: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        await userRef.set(userData, { merge: true });
        await publicProfileRef.set(userData, { merge: true });

        console.log("Seeded Admin Firestore data.");
        process.exit(0);

    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
}

seedAdmin();
