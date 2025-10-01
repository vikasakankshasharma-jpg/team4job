
import * as admin from 'firebase-admin';
import { jobs as mockJobs, users as mockUsers } from '../src/lib/data';
import { firebaseConfig } from '../src/lib/firebase-config';
import { User, Job } from '../src/lib/types';

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
    const docRef = collectionRef.doc(item.id);
    const firestoreData = { ...item };
    delete firestoreData.id; // Don't store the ID in the document body

    // Convert nested objects/arrays (bids, comments) and references
    if (firestoreData.bids) {
        firestoreData.bids.forEach((bid: any) => {
            if (bid.installer && bid.installer.id) {
                bid.installer = db.doc(`users/${bid.installer.id}`);
            }
        });
    }

    if (firestoreData.comments) {
        firestoreData.comments.forEach((comment: any) => {
            if (comment.author && comment.author.id) {
                comment.author = db.doc(`users/${comment.author.id}`);
            }
        });
    }

    if (firestoreData.jobGiver && firestoreData.jobGiver.id) {
      firestoreData.jobGiver = db.doc(`users/${firestoreData.jobGiver.id}`);
    }

    newBatch.set(docRef, firestoreData);
  });

  await newBatch.commit();
  console.log(`✅ Collection '${collectionName}' seeded successfully.`);
}

async function main() {
  try {
    await seedCollection('users', mockUsers);
    // Prepare jobs data by removing resolved objects and creating references
    const jobsToSeed = mockJobs.map(job => {
        const jobCopy = { ...job };
        
        // Bids: replace user object with a reference
        jobCopy.bids = job.bids.map(bid => {
            return { ...bid, installer: { id: bid.installer.id } }; // Keep only ID for reference creation in seedCollection
        });

        // Comments: replace user object with a reference
        jobCopy.comments = job.comments.map(comment => {
            return { ...comment, author: { id: comment.author.id } }; // Keep only ID
        });
        
        // Job Giver: replace user object with a reference
        jobCopy.jobGiver = { id: (job.jobGiver as User).id };

        return jobCopy;
    });

    await seedCollection('jobs', jobsToSeed);

    console.log('\nDatabase seeding complete! Your Firestore database now contains the mock data.');
  } catch (error) {
    console.error('\n[ERROR] An error occurred during the seeding process:', error);
    process.exit(1);
  }
}

main();
