
import * as admin from 'firebase-admin';
import { jobs as mockJobs, users as mockUsers } from '../src/lib/data';
import { firebaseConfig } from '../src/lib/firebase-config';
import type { User } from '../src/lib/types';

// IMPORTANT: Before running this script, you must have the `serviceAccountKey.json`
// file in the root directory of your project.

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

async function seedCollection(collectionName: string, data: any[]) {
  console.log(`\nSeeding collection: ${collectionName}...`);
  const collectionRef = db.collection(collectionName);
  
  let operationCount = 0;
  for (const item of data) {
    try {
      const docRef = collectionRef.doc(item.id);
      const firestoreData = { ...item };
      delete firestoreData.id; // The ID is the doc name, not part of the data.

      // Convert nested references
      if (collectionName === 'jobs') {
          if (firestoreData.jobGiver && firestoreData.jobGiver.id) {
            firestoreData.jobGiver = db.doc(`users/${firestoreData.jobGiver.id}`);
          }
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
      }
      
      await docRef.set(firestoreData);
      operationCount++;
    } catch (error) {
       console.error(`  [ERROR] Failed to write document ${item.id} to ${collectionName}.`);
       throw error; // Re-throw the error to stop the script
    }
  }
  
  console.log(`✅ Wrote ${operationCount} documents to '${collectionName}' successfully.`);
}

async function main() {
  try {
    await seedCollection('users', mockUsers);

    // Prepare jobs data with references
    const jobsToSeed = mockJobs.map(job => {
        const jobCopy = { ...job };
        jobCopy.jobGiver = { id: (job.jobGiver as User).id };
        if(job.bids) {
            jobCopy.bids = job.bids.map(bid => ({ ...bid, installer: { id: (bid.installer as User).id } }));
        }
        if(job.comments) {
            jobCopy.comments = job.comments.map(comment => ({ ...comment, author: { id: (comment.author as User).id } }));
        }
        return jobCopy;
    });

    await seedCollection('jobs', jobsToSeed);

    console.log('\nDatabase seeding complete! Your Firestore database now contains the mock data.');
  } catch (error: any) {
    console.error('\n[FATAL ERROR] The seeding process failed and was stopped.');
    if (error.code === 7 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
        console.error('\n[DIAGNOSIS] This is a PERMISSION_DENIED error.');
        console.error('This means the service account key you are using does not have the correct permissions to write to Firestore.');
        console.error('Please go to the Google Cloud Console for your project, find the IAM settings, and ensure the service account has the "Cloud Datastore User" or "Editor" role.');
    } else {
       console.error('  Error Details:', error.message);
    }
    process.exit(1);
  }
}

main();
