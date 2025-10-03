
/**
 * ----------------------------------------------------------------
 *  ATTENTION: This script is intended for development purposes only.
 * ----------------------------------------------------------------
 *
 *  This script will completely ERASE all data in the 'users' and 'jobs'
 *  collections in your Firestore database and replace it with the
 *  mock data from `src/lib/data.ts`.
 *
 *  **RUNNING THIS SCRIPT WILL RESULT IN DATA LOSS.**
 *
 *  It is designed to provide a clean, consistent dataset for development
 *  and testing. Do not run this script on a production database.
 *
 *  To execute, run the following command from your terminal:
 *  npm run db:seed
 *
 */

import { initializeApp } from 'firebase/admin/app';
import { getFirestore } from 'firebase/admin/firestore';
import { jobs, users } from '../data';
import { ServiceAccount, cert } from 'firebase-admin/app';
const serviceAccount = require('./service-account.json');


// Initialize Firebase Admin SDK
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function clearCollection(collectionPath: string) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
        console.log(`Collection '${collectionPath}' is already empty.`);
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Successfully cleared ${snapshot.size} documents from '${collectionPath}'.`);
}

async function seedCollection(collectionPath: string, data: any[]) {
    if (data.length === 0) {
        console.log(`No data provided for '${collectionPath}'. Skipping seeding.`);
        return;
    }

    const collectionRef = db.collection(collectionPath);
    const batch = db.batch();

    data.forEach(item => {
        const docRef = collectionRef.doc(item.id);
        const { id, ...rest } = item;
        
        // Convert nested plain objects into DocumentReferences where applicable
        const processedData = JSON.parse(JSON.stringify(rest), (key, value) => {
             if (key === 'jobGiver' || key === 'awardedInstaller' || key === 'installer' || key === 'author') {
                 if (typeof value === 'string' && (value.startsWith('USER-') || value.startsWith('INSTALLER-') || value.startsWith('JOBGIVER-') || value.startsWith('ADMIN-'))) {
                    return db.doc(`users/${value}`);
                }
             }
            return value;
        });

        batch.set(docRef, processedData);
    });

    await batch.commit();
    console.log(`Successfully seeded ${data.length} documents into '${collectionPath}'.`);
}

async function main() {
    console.log('Starting database seed process...');

    try {
        // Clear existing data
        console.log('\n--- Clearing Collections ---');
        await clearCollection('users');
        await clearCollection('jobs');
        
        // Seed new data
        console.log('\n--- Seeding Collections ---');
        await seedCollection('users', users);
        await seedCollection('jobs', jobs);

        console.log('\nDatabase seeding completed successfully! ✅');
    } catch (error) {
        console.error('\n❌ An error occurred during the seeding process:');
        console.error(error);
        process.exit(1);
    }
}

main();
