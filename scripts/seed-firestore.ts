
import * as admin from 'firebase-admin';
import { jobs, users } from '../src/lib/data';
import { firebaseConfig } from '../src/lib/firebase-config';

// IMPORTANT: Before running this script, you must download a service account key
// from your Firebase project settings and save it as `serviceAccountKey.json`
// in the root directory of this project.
//
// How to get the key:
// 1. Go to your Firebase project console.
// 2. Click the gear icon next to "Project Overview" and select "Project settings".
// 3. Go to the "Service accounts" tab.
// 4. Click "Generate new private key".
// 5. A file will be downloaded. Rename it to `serviceAccountKey.json` and place it
//    in the root of your project directory (at the same level as `package.json`).

try {
  const serviceAccount = require('../serviceAccountKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: firebaseConfig.projectId,
  });
} catch (error: any) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\n[ERROR] The `serviceAccountKey.json` file was not found.');
    console.error('Please follow the instructions in the `scripts/seed-firestore.ts` file to download it and try again.\n');
  } else {
    console.error('\n[ERROR] An error occurred during Firebase initialization:', error);
  }
  process.exit(1);
}


const db = admin.firestore();

async function seedCollection(collectionName: string, data: any[]) {
  console.log(`\nSeeding collection: ${collectionName}...`);
  const collectionRef = db.collection(collectionName);
  const batch = db.batch();

  // Clear existing documents in the collection
  const snapshot = await collectionRef.get();
  if (!snapshot.empty) {
    console.log(`  Deleting ${snapshot.size} existing documents...`);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  // Add new documents
  console.log(`  Adding ${data.length} new documents...`);
  const newBatch = db.batch();
  data.forEach(item => {
    // Use the existing ID if it has one, otherwise let Firestore generate it
    const docRef = item.id ? collectionRef.doc(item.id) : collectionRef.doc();

    // Convert Date objects to Firestore Timestamps
    const firestoreData = { ...item };
    for (const key in firestoreData) {
      if (firestoreData[key] instanceof Date) {
        firestoreData[key] = admin.firestore.Timestamp.fromDate(firestoreData[key]);
      }
      // Firestore does not support `undefined`, so remove keys with undefined values
      if (firestoreData[key] === undefined) {
        delete firestoreData[key];
      }
    }

    // Special handling for nested objects/arrays (bids, comments)
    if (firestoreData.bids) {
        firestoreData.bids.forEach(bid => {
            if (bid.timestamp instanceof Date) {
                bid.timestamp = admin.firestore.Timestamp.fromDate(bid.timestamp);
            }
        });
    }

    if (firestoreData.comments) {
        firestoreData.comments.forEach(comment => {
            if (comment.timestamp instanceof Date) {
                comment.timestamp = admin.firestore.Timestamp.fromDate(comment.timestamp);
            }
        });
    }

    newBatch.set(docRef, firestoreData);
  });

  await newBatch.commit();
  console.log(`✅ Collection '${collectionName}' seeded successfully.`);
}

async function main() {
  try {
    await seedCollection('users', users);
    await seedCollection('jobs', jobs);
    console.log('\nDatabase seeding complete! Your Firestore database now contains the mock data.');
  } catch (error) {
    console.error('\n[ERROR] An error occurred during the seeding process:', error);
    process.exit(1);
  }
}

main();
