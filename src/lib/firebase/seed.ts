
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
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { User, Job, Bid, Dispute } from '../types';
import { PlaceHolderImages } from '../placeholder-images';
import { config } from 'dotenv';

config(); // Load environment variables

// --- Firebase Admin SDK Initialization ---

let firebaseApp: App;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        firebaseApp = initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized using environment variable.");
    } catch (error) {
        console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY from .env:", error);
        process.exit(1);
    }
} else {
    try {
        const serviceAccount = require('./service-account.json');
        firebaseApp = initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized using service-account.json file.");
    } catch (error) {
        console.error("Could not initialize Firebase Admin SDK. Ensure either FIREBASE_SERVICE_ACCOUNT_KEY in .env or service-account.json is configured correctly.", error);
        process.exit(1);
    }
}


const adminDb = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);


// --- Mock Data Definition ---

const mockUsers: Omit<User, 'id'>[] = [
  {
    name: 'Vikas Sharma',
    email: 'admin@example.com',
    mobile: '9999999999',
    roles: ['Admin'],
    memberSince: new Date('2024-01-01'),
    avatarUrl: PlaceHolderImages[0].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/admin/200/200',
    address: { house: '1', street: 'Admin Lane', cityPincode: '110001, Connaught Place S.O', fullAddress: '1 Admin Lane, Connaught Place, New Delhi, 110001' },
    pincodes: { residential: '110001' }
  },
  {
    name: 'Priya Singh',
    email: 'jobgiver@example.com',
    mobile: '9876543210',
    roles: ['Job Giver'],
    memberSince: new Date('2024-02-10'),
    avatarUrl: PlaceHolderImages[1].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/priya/200/200',
    address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O', fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001' },
    pincodes: { residential: '560001' }
  },
  {
    name: 'Vikram Kumar',
    email: 'installer@example.com',
    mobile: '8765432109',
    roles: ['Installer', 'Job Giver'],
    memberSince: new Date('2024-03-15'),
    avatarUrl: PlaceHolderImages[2].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/vikram/200/200',
    address: { house: '42/C', street: 'Link Road', cityPincode: '400053, Andheri West S.O', fullAddress: '42/C, Link Road, Andheri West, Mumbai, 400053' },
    pincodes: { residential: '400053', office: '400063' },
    installerProfile: {
      tier: 'Gold',
      points: 1250,
      skills: ['ip camera', 'nvr setup', 'cabling', 'troubleshooting', 'ptz', 'vms'],
      rating: 4.8,
      reviews: 25,
      verified: true,
      reputationHistory: [
        { month: 'Jan', points: 100 }, { month: 'Feb', points: 350 }, { month: 'Mar', points: 600 },
        { month: 'Apr', points: 800 }, { month: 'May', points: 1050 }, { month: 'Jun', points: 1250 },
      ]
    },
  }
];


// --- Seeding Functions ---

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
    
    const jobGiverRef = adminDb.doc('users/' + jobGiverUID);
    const installerRef = adminDb.doc('users/' + installerUID);

    // --- JOB 1: Open for Bidding ---
    const job1Id = "JOB-20240720-A1B2";
    const job1Ref = adminDb.collection('jobs').doc(job1Id);
    const job1Data = {
        id: job1Id,
        title: "Install 16 Dahua IP Cameras for a Commercial Building",
        description: "We require the installation of 16 Dahua 5MP IP cameras across our 4-story commercial building in Ashok Nagar, Bengaluru. The job includes camera mounting, cabling (Cat6), and NVR configuration. All hardware will be provided.",
        jobGiver: jobGiverRef,
        location: "560001",
        fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001',
        address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O' },
        budget: { min: 20000, max: 25000 },
        status: "Open for Bidding",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 5))),
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 4))),
        jobStartDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 10))),
        bids: [], 
        bidderIds: [],
        comments: [],
        privateMessages: [],
        completionOtp: Math.floor(100000 + Math.random() * 900000).toString(),
    };
    await job1Ref.set(job1Data);

    // --- JOB 2: Completed ---
    const job2Id = "JOB-20240615-C3D4";
    const job2Ref = adminDb.collection('jobs').doc(job2Id);
    const job2Bid = {
        id: `bid-${job2Id}-${installerUID}`,
        installer: installerRef,
        amount: 52000,
        timestamp: Timestamp.fromDate(new Date('2024-06-03')),
        coverLetter: "I have extensive experience with large-scale factory installations and can complete this overhaul efficiently. My team is certified in Hikvision products."
    }
    const job2Data = {
        id: job2Id,
        title: "Factory Security System Overhaul - 32 Cameras",
        description: "Complete overhaul of an existing security system at a factory in Peenya. Requires replacing 32 old analog cameras with new Hikvision IP cameras, setting up a new server room with 2 NVRs, and integrating with our existing network.",
        jobGiver: jobGiverRef,
        location: "560058",
        fullAddress: 'Peenya Industrial Area, Bengaluru, 560058',
        address: { house: 'Plot 42', street: 'Peenya Industrial Area', cityPincode: '560058, Peenya S.O' },
        budget: { min: 45000, max: 60000 },
        status: "Completed",
        deadline: Timestamp.fromDate(new Date('2024-06-10')),
        postedAt: Timestamp.fromDate(new Date('2024-06-01')),
        jobStartDate: Timestamp.fromDate(new Date('2024-06-15')),
        awardedInstaller: installerRef,
        bids: [job2Bid],
        bidderIds: [installerUID],
        comments: [],
        privateMessages: [],
        rating: 5,
        completionOtp: "543210",
    };
    await job2Ref.set(job2Data);

    // --- JOB 3: In Progress ---
    const job3Id = "JOB-20240718-E5F6";
    const job3Ref = adminDb.collection('jobs').doc(job3Id);
     const job3Bid = {
        id: `bid-${job3Id}-${installerUID}`,
        installer: installerRef,
        amount: 8500,
        timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 3))),
        coverLetter: "I can handle this residential installation quickly and cleanly. I have the required tools and experience."
    }
    const job3Data = {
        id: job3Id,
        title: "Residential Villa - 4 PTZ Cameras",
        description: "Installation of 4 outdoor PTZ cameras for a 2-story villa. Requires weather-proof cabling and connection to a cloud-based storage service.",
        jobGiver: jobGiverRef,
        location: "400049",
        fullAddress: 'Villa 17, Juhu Tara Road, Juhu, Mumbai, 400049',
        address: { house: 'Villa 17', street: 'Juhu Tara Road', cityPincode: '400049, Juhu S.O' },
        budget: { min: 8000, max: 12000 },
        status: "In Progress",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 2))),
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 7))),
        jobStartDate: Timestamp.fromDate(new Date()),
        awardedInstaller: installerRef,
        bids: [job3Bid],
        bidderIds: [installerUID],
        comments: [],
        privateMessages: [],
        completionOtp: "987123",
    };
    await job3Ref.set(job3Data);


    console.log(`- Committed 3 jobs.`);
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
    const userUIDs = await seedAuthAndGetUIDs(mockUsers);
    
    // Seed Firestore Users with the correct UIDs
    await seedUserProfiles(mockUsers, userUIDs);

    // Seed Jobs with subcollections
    await seedJobsAndSubcollections(userUIDs);

    console.log('\nDatabase seeding completed successfully! ✅');
  } catch (e) {
      console.error('\nAn error occurred during database seeding:', e);
      process.exit(1);
  }
}

main();
