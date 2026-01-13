
import { config } from 'dotenv';
config({ path: '.env.local' });

async function inspectUser() {
    const { getAuth } = await import('firebase-admin/auth');
    const { getAdminDb } = await import('../src/lib/firebase/server-init');

    try {
        const userRecord = await getAuth().getUserByEmail('jobgiver@example.com');
        console.log(`User UID: ${userRecord.uid}`);

        const db = getAdminDb();
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
