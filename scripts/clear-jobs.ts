
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
if (!process.env.CI) {
    dotenv.config({ path: '.env.local' });
} else {
    console.log('[clear-jobs] CI detected, env file skipped');
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'team4job-live'
    });
}
const db = admin.firestore();

async function clearJobs() {
    console.log('Clearing jobs collection...');
    const jobsRef = db.collection('jobs');
    const snapshot = await jobsRef.get();

    if (snapshot.empty) {
        console.log('No jobs found.');
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} jobs.`);
}

clearJobs().catch(console.error);
