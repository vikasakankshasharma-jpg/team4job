
import * as admin from 'firebase-admin';
import { jobs as mockJobs, users as mockUsers } from '../src/lib/data';
import { firebaseConfig } from '../src/lib/firebase-config';
import { User, Job } from '../src/lib/types';

// IMPORTANT: Before running this script, you must download a service account key
// from your Firebase project settings and save it as `serviceAccountKey.json`
// in the root directory of this project.

try {
  const serviceAccount = require('../../serviceAccountKey.json');

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
  }
} catch (error: any) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\n[ERROR] The `serviceAccountKey.json` file was not found in the root directory.');
    console.error('Please ensure the file is named correctly and is in the top-level folder of your project.\n');
  } else {
    console.error('\n[ERROR] An error occurred during Firebase initialization:', error);
  }
  process.exit(1);
}


const db = admin.firestore();

// Function to get an auth client that bypasses security rules
async function getAdminAuth() {
    const auth = admin.auth();
    const { credential } = admin.app().options;
    if (!credential) {
      throw new Error('Firebase Admin SDK not initialized with a credential.');
    }
    // This part is a bit of a workaround to get a token for the service account itself.
    // In a normal setup this isn't necessary, but we are being explicit to override rules.
    const token = await (credential as any).getAccessToken();
    const customToken = await auth.createCustomToken('admin-uid', { admin: true });
    return { customToken, token };
}


async function seedCollection(collectionName: string, data: any[]) {
  console.log(`\nSeeding collection: ${collectionName}...`);
  const collectionRef = db.collection(collectionName);
  
  // Start a new batched write
  let batch = db.batch();
  let operationCount = 0;
  
  // It's safer to delete and then add in separate transaction batches.
  console.log(`  Querying existing documents in ${collectionName} to delete...`);
  const snapshot = await collectionRef.get();
  if (!snapshot.empty) {
    console.log(`  Deleting ${snapshot.size} existing documents...`);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      operationCount++;
      if (operationCount >= 499) { // Firestore batch limit is 500 operations
        batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    });
    if (operationCount > 0) {
      await batch.commit();
    }
    console.log('  Deletion complete.');
  } else {
    console.log('  No existing documents to delete.');
  }

  // Add new documents in batches
  console.log(`  Adding ${data.length} new documents...`);
  batch = db.batch();
  operationCount = 0;

  for (const item of data) {
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

    batch.set(docRef, firestoreData);
    operationCount++;
    if (operationCount >= 499) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ Collection '${collectionName}' seeded successfully.`);
}

async function main() {
  try {
    console.log('Attempting to seed database with admin privileges...');
    
    await seedCollection('users', mockUsers);
    
    const jobsToSeed = mockJobs.map(job => {
        const jobCopy = { ...job };
        
        jobCopy.bids = job.bids.map(bid => ({ ...bid, installer: { id: (bid.installer as User).id } }));
        jobCopy.comments = job.comments.map(comment => ({ ...comment, author: { id: (comment.author as User).id } }));
        jobCopy.jobGiver = { id: (job.jobGiver as User).id };

        return jobCopy;
    });

    await seedCollection('jobs', jobsToSeed);

    console.log('\nDatabase seeding complete! Your Firestore database now contains the mock data.');
  } catch (error: any) {
    console.error('\n[ERROR] An error occurred during the seeding process:');
    // Provide a more detailed error log
    console.error(`  Error Code: ${error.code}`);
    console.error(`  Error Details: ${error.details || error.message}`);
    if (error.code === 7 || (error.details && error.details.includes('PERMISSION_DENIED'))) {
        console.error('\n[DIAGNOSIS] This is a PERMISSION_DENIED error. This can happen if the service account is missing the "Cloud Datastore User" or "Editor" role in Google Cloud IAM, or if there is an organization policy blocking access.');
        console.error('Please check the IAM settings for your project in the Google Cloud Console.');
    }
    process.exit(1);
  }
}

main();
