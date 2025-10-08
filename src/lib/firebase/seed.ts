
/**
 * ----------------------------------------------------------------
 *  ATTENTION: This script is intended for development purposes only.
 * ----------------------------------------------------------------
 *
 *  This script will ERASE and RE-POPULATE your Firestore database
 *  and Firebase Auth with a consistent set of demo data.
 *
 *  RUNNING THIS SCRIPT WILL RESULT IN DATA LOSS.
 *
 *  To execute, run the following command from your terminal:
 *  npm run db:seed
 *
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { users as mockUsersData } from '../data';
import type { User } from '../types';

const serviceAccount = require('./service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const adminDb = getFirestore();
const adminAuth = getAuth();

async function clearCollection(collectionPath: string) {
  console.log(`Clearing collection: ${collectionPath}...`);
  const collectionRef = adminDb.collection(collectionPath);
  const snapshot = await collectionRef.limit(500).get();
  if (snapshot.empty) {
    console.log(`- Collection ${collectionPath} is already empty.`);
    return;
  }

  const batch = adminDb.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`- Cleared part of ${collectionPath}. Running again...`);
  await clearCollection(collectionPath);
}

async function clearAuthUsers() {
    console.log("\nClearing all authentication users...");
    try {
        const listUsersResult = await adminAuth.listUsers(1000);
        if (listUsersResult.users.length === 0) {
            console.log("- No auth users to clear.");
            return;
        }
        const uidsToDelete = listUsersResult.users.map(u => u.uid);
        await adminAuth.deleteUsers(uidsToDelete);
        console.log(`- Deleted ${uidsToDelete.length} auth users.`);
        if (listUsersResult.pageToken) {
            await clearAuthUsers();
        }
    } catch(error) {
        console.error("Error clearing auth users:", error);
    }
}

async function seedAuthAndGetUIDs(users: Omit<User, 'id'>[]) {
    console.log('\nCreating authentication users...');
    const userUIDs: { [email: string]: string } = {};
    for (const user of users) {
        try {
            const userRecord = await adminAuth.createUser({
                email: user.email,
                password: "password123", // All users get a default password
                displayName: user.name,
            });
            userUIDs[user.email] = userRecord.uid;
            console.log(`- Created auth user: ${user.email} (UID: ${userRecord.uid})`);
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                 const userRecord = await adminAuth.getUserByEmail(user.email);
                 userUIDs[user.email] = userRecord.uid;
                 console.log(`- Auth user already exists: ${user.email} (UID: ${userRecord.uid})`);
            } else {
                console.error(`- Error creating auth user ${user.email}:`, error.message);
            }
        }
    }
    return userUIDs;
}

async function seedUserProfiles(users: Omit<User, 'id'>[], uids: { [email: string]: string }) {
    console.log('\nCreating user profiles in Firestore...');
    const batch = adminDb.batch();
    users.forEach(user => {
        const uid = uids[user.email];
        if (!uid) return;

        const userRef = adminDb.collection('users').doc(uid);
        
        const firestoreUserData: any = {
            ...user,
            memberSince: Timestamp.fromDate(new Date(user.memberSince as Date)),
        };
        if (firestoreUserData.creditsExpiry) {
            firestoreUserData.creditsExpiry = Timestamp.fromDate(new Date(firestoreUserData.creditsExpiry as Date));
        }

        batch.set(userRef, firestoreUserData);
    });
    await batch.commit();
    console.log(`- Committed ${users.length} user profiles.`);
}

async function seedJobsAndSubcollections(uids: { [email: string]: string }) {
    console.log('\nCreating jobs and related data...');
    const jobGiverUID = uids['jobgiver@example.com'];
    const installerUID = uids['installer@example.com'];

    if (!jobGiverUID || !installerUID) {
        throw new Error("Required mock users not found for seeding.");
    }
    
    // --- JOB 1: Open for Bidding ---
    const job1Id = "JOB-20240720-A1B2";
    const job1Ref = adminDb.collection('jobs').doc(job1Id);
    const job1Data = {
        id: job1Id,
        title: "Install 16 Dahua IP Cameras for a Commercial Building",
        description: "We require the installation of 16 Dahua 5MP IP cameras across our 4-story commercial building in Ashok Nagar, Bengaluru. The job includes camera mounting, cabling (Cat6), and NVR configuration. All hardware will be provided.",
        jobGiver: adminDb.doc('users/' + jobGiverUID),
        location: "560001",
        fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001',
        address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashok Nagar' },
        budget: { min: 20000, max: 25000 },
        status: "Open for Bidding" as const,
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 5))),
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 4))),
        jobStartDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 10))),
        bids: [], // Bids will be added later if needed
        bidderIds: [],
        comments: [],
        completionOtp: Math.floor(100000 + Math.random() * 900000).toString(),
    };
    await job1Ref.set(job1Data);

    // --- JOB 2: Completed ---
    const job2Id = "JOB-20240615-C3D4";
    const job2Ref = adminDb.collection('jobs').doc(job2Id);
    const job2Data = {
        id: job2Id,
        title: "Factory Security System Overhaul - 32 Cameras",
        description: "Complete overhaul of an existing security system at a factory in Peenya. Requires replacing 32 old analog cameras with new Hikvision IP cameras, setting up a new server room with 2 NVRs, and integrating with our existing network.",
        jobGiver: adminDb.doc('users/' + jobGiverUID),
        location: "560058",
        fullAddress: 'Peenya Industrial Area, Bengaluru, 560058',
        address: { house: 'Plot 42', street: 'Peenya Industrial Area', cityPincode: '560058, Peenya' },
        budget: { min: 45000, max: 60000 },
        status: "Completed" as const,
        deadline: Timestamp.fromDate(new Date('2024-06-10')),
        postedAt: Timestamp.fromDate(new Date('2024-06-01')),
        jobStartDate: Timestamp.fromDate(new Date('2024-06-15')),
        awardedInstaller: adminDb.doc('users/' + installerUID),
        bids: [],
        bidderIds: [installerUID],
        comments: [],
        privateMessages: [],
        rating: 5,
        completionOtp: "543210",
    };
    await job2Ref.set(job2Data);

    console.log(`- Committed 2 jobs.`);
}

async function main() {
  try {
    console.log('--- Starting Database Seeding ---');
    
    // Clear Auth & Firestore
    await clearAuthUsers();
    await clearCollection('disputes');
    await clearCollection('jobs');
    await clearCollection('users');
    
    // Seed Auth and get back the real UIDs
    const userUIDs = await seedAuthAndGetUIDs(mockUsersData);
    
    // Seed Firestore Users with the correct UIDs
    await seedUserProfiles(mockUsersData, userUIDs);

    // Seed Jobs with subcollections
    await seedJobsAndSubcollections(userUIDs);

    console.log('\nDatabase seeding completed successfully! ✅');
  } catch (e) {
      console.error('\nAn error occurred during database seeding:', e);
      process.exit(1);
  }
}

main();
