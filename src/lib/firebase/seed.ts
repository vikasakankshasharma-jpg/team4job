
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
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { users as mockUsers } from '../data';
import type { Job, User, Bid, Comment, PrivateMessage, Dispute } from '../types';

// IMPORTANT: Replace with the actual path to your service account key file
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
            // Recurse if there are more users
            await clearAuthUsers();
        }
    } catch(error) {
        console.error("Error clearing auth users:", error);
    }
}

async function seedAuthUsers(users: User[]) {
    console.log('\nCreating authentication users...');
    for (const user of users) {
        try {
            await adminAuth.createUser({
                uid: user.id,
                email: user.email,
                password: "password123", // All users get a default password for demo purposes
                displayName: user.name,
            });
            console.log(`- Created auth user: ${user.email}`);
        } catch (error: any) {
            if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
                console.log(`- Auth user already exists: ${user.email}`);
            } else {
                console.error(`- Error creating auth user ${user.email}:`, error.message);
            }
        }
    }
}

async function seedUserProfiles(users: User[]) {
    console.log('\nCreating user profiles in Firestore...');
    const batch = adminDb.batch();
    users.forEach(user => {
        const { id, ...userData } = user;
        const userRef = adminDb.collection('users').doc(id);
        
        const firestoreUserData: any = {
            ...userData,
            memberSince: Timestamp.fromDate(new Date(userData.memberSince as Date)),
        };
        if (firestoreUserData.creditsExpiry) {
            firestoreUserData.creditsExpiry = Timestamp.fromDate(new Date(firestoreUserData.creditsExpiry as Date));
        }

        batch.set(userRef, firestoreUserData);
    });
    await batch.commit();
    console.log(`- Committed ${users.length} user profiles.`);
}

async function seedJobsAndSubcollections() {
    console.log('\nCreating jobs and related data...');
    const jobGiver = mockUsers.find(u => u.id === 'jobgiver-user-01');
    const installer1 = mockUsers.find(u => u.id === 'installer-user-01');
    const installer2 = mockUsers.find(u => u.id === 'installer-user-02');

    if (!jobGiver || !installer1 || !installer2) {
        throw new Error("Required mock users not found for seeding.");
    }
    
    // --- JOB 1: Open for Bidding ---
    const job1Id = "JOB-20240720-A1B2";
    const job1Ref = adminDb.collection('jobs').doc(job1Id);
    await job1Ref.set({
        id: job1Id,
        title: "Install 16 Dahua IP Cameras for a Commercial Building",
        description: "We require the installation of 16 Dahua 5MP IP cameras across our 4-story commercial building in Ashok Nagar, Bengaluru. The job includes camera mounting, cabling (Cat6), and NVR configuration. All hardware will be provided.",
        jobGiver: adminDb.doc('users/' + jobGiver.id),
        location: "560001",
        fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001',
        address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashok Nagar' },
        budget: { min: 20000, max: 25000 },
        status: "Open for Bidding",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 5))),
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 4))),
        jobStartDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 10))),
        bids: [
            { id: "BID-J1-I1", installer: adminDb.doc('users/' + installer1.id), amount: 22000, timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 2))), coverLetter: "I have extensive experience with large commercial Dahua setups. My team can complete this efficiently and professionally." },
            { id: "BID-J1-I2", installer: adminDb.doc('users/' + installer2.id), amount: 24500, timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 1))), coverLetter: "Confident in providing a high-quality installation. I can start as per the required schedule." },
        ],
        bidderIds: [installer1.id, installer2.id],
        comments: [
            { id: "CMT-J1-I2", author: adminDb.doc('users/' + installer2.id), timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 3))), content: "Is the Cat6 cable plenum-rated?"},
            { id: "CMT-J1-JG", author: adminDb.doc('users/' + jobGiver.id), timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 3))), content: "Yes, all provided materials meet commercial building codes."},
        ],
        completionOtp: Math.floor(100000 + Math.random() * 900000).toString(),
    });

    // --- JOB 2: Completed ---
    const job2Id = "JOB-20240615-C3D4";
    const job2Ref = adminDb.collection('jobs').doc(job2Id);
    await job2Ref.set({
        id: job2Id,
        title: "Factory Security System Overhaul - 32 Cameras",
        description: "Complete overhaul of an existing security system at a factory in Peenya. Requires replacing 32 old analog cameras with new Hikvision IP cameras, setting up a new server room with 2 NVRs, and integrating with our existing network.",
        jobGiver: adminDb.doc('users/' + jobGiver.id),
        location: "560058",
        fullAddress: 'Peenya Industrial Area, Bengaluru, 560058',
        address: { house: 'Plot 42', street: 'Peenya Industrial Area', cityPincode: '560058, Peenya' },
        budget: { min: 45000, max: 60000 },
        status: "Completed",
        deadline: Timestamp.fromDate(new Date('2024-06-10')),
        postedAt: Timestamp.fromDate(new Date('2024-06-01')),
        jobStartDate: Timestamp.fromDate(new Date('2024-06-15')),
        awardedInstaller: adminDb.doc('users/' + installer1.id),
        bids: [
            { id: "BID-J2-I1", installer: adminDb.doc('users/' + installer1.id), amount: 55000, timestamp: Timestamp.fromDate(new Date('2024-06-05')), coverLetter: "My team specializes in industrial-scale security deployments and can handle this project seamlessly." },
        ],
        bidderIds: [installer1.id],
        comments: [],
        privateMessages: [],
        rating: 5,
        completionOtp: "543210",
    });

    // --- JOB 3: In Progress ---
    const job3Id = "JOB-20240710-E5F6";
    const job3Ref = adminDb.collection('jobs').doc(job3Id);
    await job3Ref.set({
        id: job3Id,
        title: "Home Security Setup - 4 Wireless Cameras",
        description: "Need a simple home security setup with 4 TP-Link Tapo wireless cameras. Installation should include camera placement, connection to home WiFi, and setup of the mobile app.",
        jobGiver: adminDb.doc('users/' + jobGiver.id),
        location: "500081",
        fullAddress: '101, Cyber Towers, Hitech City, Madhapur, Hyderabad, 500081',
        address: { house: '101, Cyber Towers', street: 'Hitech City', cityPincode: '500081, Madhapur' },
        budget: { min: 4000, max: 6000 },
        status: "In Progress",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 10))),
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 15))),
        jobStartDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 1))),
        awardedInstaller: adminDb.doc('users/' + installer2.id),
        bids: [
            { id: "BID-J3-I2", installer: adminDb.doc('users/' + installer2.id), amount: 5000, timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 12))), coverLetter: "Quick and clean installation guaranteed. I can get this done for you this week." },
        ],
        bidderIds: [installer2.id],
        comments: [],
        privateMessages: [
            { id: "PM-J3-1", author: adminDb.doc('users/' + jobGiver.id), timestamp: Timestamp.now(), content: "Thanks for starting today. Can you place the camera in the backyard to overlook the garden?" },
        ],
        completionOtp: "123456",
    });

    console.log(`- Committed 3 jobs with related data.`);
}

async function seedDisputes() {
    console.log("\nCreating disputes...");
    const jobGiver = mockUsers.find(u => u.id === 'jobgiver-user-01');
    const installer = mockUsers.find(u => u.id === 'installer-user-01');
    if (!jobGiver || !installer) return;

    const disputeId = "DISPUTE-20240701-XYZ1";
    await adminDb.collection('disputes').doc(disputeId).set({
        id: disputeId,
        requesterId: jobGiver.id,
        category: "Job Dispute",
        title: "Work not completed as per agreement",
        jobId: "JOB-20240615-C3D4",
        jobTitle: "Factory Security System Overhaul - 32 Cameras",
        status: 'Open',
        reason: "The installer has marked the job as complete, but two of the cameras are not showing any feed in the NVR. The installer is not responding to my calls.",
        parties: {
            jobGiverId: jobGiver.id,
            installerId: installer.id,
        },
        messages: [
            { authorId: jobGiver.id, authorRole: 'Job Giver', content: "The job is not complete. Two cameras are offline.", timestamp: Timestamp.fromDate(new Date()) }
        ],
        createdAt: Timestamp.fromDate(new Date()),
    });
    console.log("- Committed 1 dispute.");
}


async function main() {
  try {
    console.log('--- Starting Database Seeding ---');
    
    // Clear Auth & Firestore
    await clearAuthUsers();
    await clearCollection('disputes');
    await clearCollection('jobs');
    await clearCollection('users');
    
    // Seed Auth
    await seedAuthUsers(mockUsers);
    
    // Seed Firestore Users
    await seedUserProfiles(mockUsers);

    // Seed Jobs with subcollections
    await seedJobsAndSubcollections();
    
    // Seed Disputes
    await seedDisputes();

    console.log('\nDatabase seeding completed successfully! ✅');
  } catch (e) {
      console.error('\nAn error occurred during database seeding:', e);
      process.exit(1);
  }
}

main();
