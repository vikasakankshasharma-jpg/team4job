
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
import type { User, Job, Dispute, BlacklistEntry } from '../types';
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
  { // 0: Admin
    name: 'Vikas Sharma',
    email: 'admin@example.com',
    mobile: '9999999999',
    roles: ['Admin'],
    status: 'active',
    memberSince: new Date('2024-01-01'),
    avatarUrl: PlaceHolderImages[0].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/admin/200/200',
    address: { house: '1', street: 'Admin Lane', cityPincode: '110001, Connaught Place S.O', fullAddress: '1 Admin Lane, Connaught Place, New Delhi, 110001' },
    pincodes: { residential: '110001' }
  },
  { // 1: Job Giver
    name: 'Priya Singh',
    email: 'jobgiver@example.com',
    mobile: '9876543210',
    roles: ['Job Giver'],
    status: 'active',
    memberSince: new Date('2024-02-10'),
    avatarUrl: PlaceHolderImages[1].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/priya/200/200',
    address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O', fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001' },
    pincodes: { residential: '560001' }
  },
  { // 2: Dual Role (Installer/Job Giver)
    name: 'Vikram Kumar',
    email: 'installer@example.com',
    mobile: '8765432109',
    roles: ['Installer', 'Job Giver'],
    status: 'active',
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
  },
  { // 3: Installer Only
    name: 'Ravi Kumar',
    email: 'just-installer@example.com',
    mobile: '7654321098',
    roles: ['Installer'],
    status: 'active',
    memberSince: new Date('2024-04-01'),
    avatarUrl: PlaceHolderImages[3].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/ravi/200/200',
    address: { house: 'Plot 88', street: 'Sector 18', cityPincode: '122022, Gurgaon S.O', fullAddress: 'Plot 88, Sector 18, Gurgaon, Haryana, 122022' },
    pincodes: { residential: '122022' },
    installerProfile: {
      tier: 'Bronze',
      points: 150,
      skills: ['ip camera', 'cabling', 'troubleshooting'],
      rating: 4.5,
      reviews: 5,
      verified: true,
      reputationHistory: [
        { month: 'Apr', points: 50 }, { month: 'May', points: 100 }, { month: 'Jun', points: 150 },
      ]
    },
  },
  { // 4: New Job Giver
    name: 'Sunita Gupta',
    email: 'sunita.g@example.com',
    mobile: '9123456789',
    roles: ['Job Giver'],
    status: 'active',
    memberSince: new Date('2024-05-20'),
    avatarUrl: PlaceHolderImages[4].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/sunita/200/200',
    address: { house: 'Flat 101', street: 'Koregaon Park', cityPincode: '411001, Pune S.O', fullAddress: 'Flat 101, Koregaon Park, Pune, 411001' },
    pincodes: { residential: '411001' },
  },
  { // 5: New Installer
    name: 'Arjun Singh',
    email: 'arjun.s@example.com',
    mobile: '9988776655',
    roles: ['Installer'],
    status: 'active',
    memberSince: new Date('2024-06-01'),
    avatarUrl: PlaceHolderImages[5].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/arjun/200/200',
    address: { house: '15/A', street: 'Salt Lake', cityPincode: '700091, Salt Lake S.O', fullAddress: '15/A, Salt Lake, Kolkata, 700091' },
    pincodes: { residential: '700091' },
    installerProfile: {
      tier: 'Bronze',
      points: 50,
      skills: ['analog cameras', 'dvr setup'],
      rating: 0,
      reviews: 0,
      verified: true,
      reputationHistory: [],
    },
  },
  { // 6: Unverified Installer with a bad rating
    name: 'Anil Kapoor',
    email: 'anil.k@example.com',
    mobile: '9898989898',
    roles: ['Installer'],
    status: 'active',
    memberSince: new Date('2024-02-15'),
    avatarUrl: PlaceHolderImages[6].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/anil/200/200',
    address: { house: '7, Janpath', street: 'Connaught Place', cityPincode: '110001, Connaught Place S.O', fullAddress: '7, Janpath, Connaught Place, New Delhi, 110001' },
    pincodes: { residential: '110001' },
    installerProfile: {
      tier: 'Bronze',
      points: 25,
      skills: ['ip camera', 'troubleshooting'],
      rating: 2.5,
      reviews: 4,
      verified: false, // Not verified
      reputationHistory: [],
    },
  },
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
  
  if (snapshot.size === 500) {
      console.log(`- Cleared part of ${collectionPath}. Running again...`);
      await clearCollection(collectionPath);
  } else {
      console.log(`- Cleared ${snapshot.size} documents from ${collectionPath}.`);
  }
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
                emailVerified: true,
                disabled: false,
            });
            userUIDs[user.email] = userRecord.uid;
            console.log(`- Created auth user: ${user.email} (UID: ${userRecord.uid})`);
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                 const userRecord = await adminAuth.getUserByEmail(user.email);
                 userUIDs[user.email] = userRecord.uid;
                 // Ensure password is set for existing user, in case it was created without one
                 await adminAuth.updateUser(userRecord.uid, { password: 'password123' });
                 console.log(`- Auth user already exists, password updated: ${user.email} (UID: ${userRecord.uid})`);
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
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 30); // Default 30-day trial for all

    users.forEach(user => {
        const uid = uids[user.email];
        if (!uid) return;

        const userRef = adminDb.collection('users').doc(uid);
        
        const firestoreUserData: any = {
            ...user,
            id: uid,
            memberSince: Timestamp.fromDate(new Date(user.memberSince as Date)),
            subscription: {
                planId: 'trial',
                planName: 'Free Trial',
                expiresAt: Timestamp.fromDate(trialExpiry),
            }
        };
        
        batch.set(userRef, firestoreUserData);
    });
    await batch.commit();
    console.log(`- Committed ${users.length} user profiles.`);
}

async function seedJobsAndSubcollections(uids: { [email: string]: string }) {
    console.log('\nCreating jobs and related data...');
    const jobGiverUID = uids[mockUsers[1].email];
    const installerUID = uids[mockUsers[2].email];
    const justInstallerUID = uids[mockUsers[3].email];
    const newJobGiverUID = uids[mockUsers[4].email];
    
    if (!jobGiverUID || !installerUID || !justInstallerUID || !newJobGiverUID) {
        throw new Error("Required mock users not found for seeding jobs.");
    }
    
    const refs = {
        jobGiver: adminDb.doc('users/' + jobGiverUID),
        installer: adminDb.doc('users/' + installerUID),
        justInstaller: adminDb.doc('users/' + justInstallerUID),
        newJobGiver: adminDb.doc('users/' + newJobGiverUID),
    };

    // --- JOB 1: Open for Bidding ---
    const job1Id = "JOB-20240720-A1B2";
    const job1Ref = adminDb.collection('jobs').doc(job1Id);
    const job1Bid = {
        installer: refs.installer,
        amount: 22500,
        timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 1))),
        coverLetter: "I'm a Gold-tier installer with 5 years of experience in large commercial projects. I can start next week and ensure a clean, professional installation."
    }
    await job1Ref.set({
        id: job1Id,
        title: "Install 16 Dahua IP Cameras for a Commercial Building",
        description: "We require the installation of 16 Dahua 5MP IP cameras across our 4-story commercial building in Ashok Nagar, Bengaluru. The job includes camera mounting, cabling (Cat6), and NVR configuration. All hardware will be provided.",
        jobGiver: refs.jobGiver,
        location: "560001",
        fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001',
        address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O' },
        budget: { min: 20000, max: 25000 },
        status: "Open for Bidding",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 5))),
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 4))),
        jobStartDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 10))),
        bids: [job1Bid], 
        bidderIds: [installerUID],
        comments: [],
        privateMessages: [],
        completionOtp: Math.floor(100000 + Math.random() * 900000).toString(),
    });

    // --- JOB 2: Completed ---
    const job2Id = "JOB-20240615-C3D4";
    await adminDb.collection('jobs').doc(job2Id).set({
        id: job2Id,
        title: "Factory Security System Overhaul - 32 Cameras",
        description: "Complete overhaul of an existing security system at a factory in Peenya. Requires replacing 32 old analog cameras with new Hikvision IP cameras, setting up a new server room with 2 NVRs, and integrating with our existing network.",
        jobGiver: refs.jobGiver,
        location: "560058",
        fullAddress: 'Peenya Industrial Area, Bengaluru, 560058',
        address: { house: 'Plot 42', street: 'Peenya Industrial Area', cityPincode: '560058, Peenya S.O' },
        budget: { min: 45000, max: 60000 },
        status: "Completed",
        deadline: Timestamp.fromDate(new Date('2024-06-10')),
        postedAt: Timestamp.fromDate(new Date('2024-06-01')),
        jobStartDate: Timestamp.fromDate(new Date('2024-06-15')),
        awardedInstaller: refs.installer,
        bids: [{ installer: refs.installer, amount: 52000, timestamp: Timestamp.fromDate(new Date('2024-06-03')), coverLetter: "I have extensive experience with large-scale factory installations."}],
        bidderIds: [installerUID],
        rating: 5,
        completionOtp: "543210",
        comments: [],
        privateMessages: [],
    });

    // --- JOB 3: In Progress ---
    const job3Id = "JOB-20240718-E5F6";
    await adminDb.collection('jobs').doc(job3Id).set({
        id: job3Id,
        title: "Residential Villa - 4 PTZ Cameras",
        description: "Installation of 4 outdoor PTZ cameras for a 2-story villa. Requires weather-proof cabling and connection to a cloud-based storage service.",
        jobGiver: refs.jobGiver,
        location: "400049",
        fullAddress: 'Villa 17, Juhu Tara Road, Juhu, Mumbai, 400049',
        address: { house: 'Villa 17', street: 'Juhu Tara Road', cityPincode: '400049, Juhu S.O' },
        budget: { min: 8000, max: 12000 },
        status: "In Progress",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 2))),
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 7))),
        jobStartDate: Timestamp.fromDate(new Date()),
        awardedInstaller: refs.justInstaller,
        bids: [{ installer: refs.justInstaller, amount: 8500, timestamp: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 3))), coverLetter: "I can handle this residential installation quickly and cleanly." }],
        bidderIds: [justInstallerUID],
        comments: [],
        privateMessages: [],
        completionOtp: "987123",
    });

    // --- JOB 4: Unbid Job ---
    const job4Id = "JOB-20240722-G7H8";
     await adminDb.collection('jobs').doc(job4Id).set({
        id: job4Id,
        title: "Unbid Job: Small Shop Camera Setup",
        description: "Looking for an installer to set up 2 dome cameras in a small retail shop. Simple setup, hardware provided.",
        jobGiver: refs.newJobGiver,
        location: "110001",
        fullAddress: 'Shop 5, Khan Market, New Delhi, 110001',
        address: { house: 'Shop 5', street: 'Khan Market', cityPincode: '110001, Connaught Place S.O' },
        budget: { min: 2000, max: 4000 },
        status: "Unbid",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 1))), // Deadline passed
        postedAt: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 5))),
        jobStartDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 2))),
        bids: [],
        bidderIds: [],
        comments: [],
        privateMessages: [],
        completionOtp: "112233",
    });
    
    // --- JOB 5: Recommended Job for Main Installer ---
    const job5Id = "JOB-20240725-J9K0";
    await adminDb.collection('jobs').doc(job5Id).set({
        id: job5Id,
        title: "Urgent: Replace 4 Cameras at Andheri Office",
        description: "Need an experienced installer to urgently replace four faulty outdoor cameras at a corporate office in Andheri West. Must be familiar with Hikvision systems. Job needs to be completed this weekend.",
        jobGiver: refs.newJobGiver,
        location: "400053", // Matches installer@example.com's residential pincode
        fullAddress: '5th Floor, Corporate Heights, Andheri West, Mumbai, 400053',
        address: { house: '5th Floor, Corporate Heights', street: 'Veera Desai Road', cityPincode: '400053, Andheri West S.O' },
        budget: { min: 6000, max: 9000 },
        status: "Open for Bidding",
        deadline: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 2))),
        postedAt: Timestamp.fromDate(new Date()),
        jobStartDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 4))),
        bids: [],
        bidderIds: [],
        comments: [],
        privateMessages: [],
        completionOtp: "445566",
    });

    console.log(`- Committed 5 jobs.`);
}

async function seedDisputes(uids: { [email: string]: string }) {
    console.log('\nCreating disputes...');
    const jobGiverUID = uids[mockUsers[1].email];
    const installerUID = uids[mockUsers[2].email];
    const badInstallerUID = uids[mockUsers[6].email];

    if (!jobGiverUID || !installerUID || !badInstallerUID) {
        throw new Error("Required mock users not found for seeding disputes.");
    }
    
    const dispute1Id = "DISPUTE-1721981880000";
    await adminDb.collection('disputes').doc(dispute1Id).set({
        id: dispute1Id,
        requesterId: installerUID,
        category: "Job Dispute",
        title: "Dispute for job: Factory Security System Overhaul",
        jobId: "JOB-20240615-C3D4",
        jobTitle: "Factory Security System Overhaul - 32 Cameras",
        status: 'Resolved',
        reason: "The job giver has not released the payment even after the job was marked as complete two weeks ago. The work was finished to their satisfaction.",
        parties: { jobGiverId: jobGiverUID, installerId: installerUID },
        messages: [
            { authorId: installerUID, authorRole: 'Installer', content: "Initial complaint: Payment not released.", timestamp: Timestamp.fromDate(new Date('2024-07-20T10:00:00Z')) },
            { authorId: jobGiverUID, authorRole: 'Job Giver', content: "I was on vacation and missed the notification. Apologies for the delay.", timestamp: Timestamp.fromDate(new Date('2024-07-21T11:00:00Z')) },
            { authorId: uids[mockUsers[0].email], authorRole: 'Admin', content: "It seems to be a misunderstanding. Job Giver, please confirm the payment release. Closing this dispute.", timestamp: Timestamp.fromDate(new Date('2024-07-21T12:00:00Z')) },
        ],
        resolution: "Resolved amicably. Payment was delayed due to oversight.",
        createdAt: Timestamp.fromDate(new Date('2024-07-20T10:00:00Z')),
        resolvedAt: Timestamp.fromDate(new Date('2024-07-21T12:01:00Z')),
    });
    
    console.log(`- Committed 1 dispute.`);
}

async function seedBlacklist() {
    console.log('\nSeeding blacklist...');
    const badInstallerUID = (await adminAuth.getUserByEmail('anil.k@example.com')).uid;
    
    const blacklistEntry: BlacklistEntry = {
      id: `BL-USER-${Date.now()}`,
      type: "user",
      value: badInstallerUID,
      role: 'Installer',
      reason: 'Repeated low-quality work and customer complaints.',
      createdAt: Timestamp.now(),
    };
    await adminDb.collection('blacklist').doc(blacklistEntry.id).set(blacklistEntry);

    console.log('- Committed 1 blacklist entry.');
}


async function clearAllCollections() {
    const collections = ['disputes', 'jobs', 'users', 'blacklist', 'coupons', 'transactions', 'subscriptionPlans'];
    for (const collection of collections) {
        await clearCollection(collection);
    }
}


async function main() {
  try {
    console.log('--- Starting Database Seeding ---');
    
    // Clear Auth & Firestore
    await clearAuthUsers();
    await clearAllCollections();
    
    // Seed Auth and get back the real UIDs
    const userUIDs = await seedAuthAndGetUIDs(mockUsers);
    
    // Seed Firestore Users with the correct UIDs
    await seedUserProfiles(mockUsers, userUIDs);

    // Seed Jobs with subcollections
    await seedJobsAndSubcollections(userUIDs);

    // Seed Disputes
    await seedDisputes(userUIDs);
    
    // Seed Blacklist
    await seedBlacklist();

    console.log('\nDatabase seeding completed successfully! ✅');
  } catch (e) {
      console.error('\nAn error occurred during database seeding:', e);
      process.exit(1);
  }
}

main();
