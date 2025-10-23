

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
import type { User, Job, Dispute, BlacklistEntry, Transaction } from '../types';
import { PlaceHolderImages } from '../placeholder-images';
import { config } from 'dotenv';

config(); // Load environment variables

// --- Firebase Admin SDK Initialization ---

let firebaseApp: App;

function initializeFirebaseAdmin() {
    // 1. Try to use service-account.json first
    try {
        const serviceAccount = require('./service-account.json');
        firebaseApp = initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized using service-account.json file.");
        return;
    } catch (error: any) {
        if (error.code !== 'MODULE_NOT_FOUND') {
            console.error("Error reading or parsing service-account.json:", error);
            process.exit(1);
        }
        // If file is not found, proceed to check environment variable
    }

    // 2. If file not found, try to use environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            firebaseApp = initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("Firebase Admin SDK initialized using environment variable.");
            return;
        } catch (error) {
            console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY from .env:", error);
            process.exit(1);
        }
    }

    // 3. If neither method works, exit
    console.error("Could not initialize Firebase Admin SDK. Ensure either service-account.json exists or FIREBASE_SERVICE_ACCOUNT_KEY is set in your environment.");
    process.exit(1);
}

initializeFirebaseAdmin();


const adminDb = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);


// --- Mock Data Definition ---

const mockUsers: Omit<User, 'id'>[] = [
  { // 0: Admin
    name: 'Vikas Sharma',
    email: 'vikasakankshasharma@gmail.com',
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
  { // 6: Unverified Installer
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
      verified: false,
      reputationHistory: [],
    },
  },
  { // 7: Suspended Installer
    name: 'Sanjay Verma',
    email: 'sanjay.v@example.com',
    mobile: '9797979797',
    roles: ['Installer'],
    status: 'suspended',
    suspensionEndDate: new Date(new Date().setDate(new Date().getDate() + 30)),
    memberSince: new Date('2024-03-01'),
    avatarUrl: PlaceHolderImages[7].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/sanjay/200/200',
    address: { house: 'House 55', street: 'Sector 22', cityPincode: '160022, Sector 22 S.O', fullAddress: 'House 55, Sector 22, Chandigarh, 160022' },
    pincodes: { residential: '160022' },
    installerProfile: {
      tier: 'Silver',
      points: 600,
      skills: ['vms', 'access control'],
      rating: 3.1,
      reviews: 12,
      verified: true,
      reputationHistory: [],
    },
  },
    { // 8: Platinum Installer
    name: 'Deepika Rao',
    email: 'deepika.r@example.com',
    mobile: '9696969696',
    roles: ['Installer'],
    status: 'active',
    memberSince: new Date('2023-01-20'),
    avatarUrl: PlaceHolderImages[0].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/deepika/200/200',
    address: { house: 'Penthouse A', street: 'Marine Drive', cityPincode: '400002, Kalbadevi S.O', fullAddress: 'Penthouse A, Marine Drive, Mumbai, 400002' },
    pincodes: { residential: '400002' },
    installerProfile: {
      tier: 'Platinum',
      points: 2500,
      skills: ['ip camera', 'nvr setup', 'cabling', 'troubleshooting', 'ptz', 'vms', 'fiber optics', 'thermal cameras', 'access control'],
      rating: 4.9,
      reviews: 55,
      verified: true,
      reputationHistory: [],
    },
  },
  { // 9: Support Team member
    name: 'Amit Patel',
    email: 'support@example.com',
    mobile: '9595959595',
    roles: ['Support Team'],
    status: 'active',
    memberSince: new Date('2024-04-10'),
    avatarUrl: PlaceHolderImages[1].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/amit/200/200',
    address: { house: '10B', street: 'Support Street', cityPincode: '110001, Connaught Place S.O', fullAddress: '10B, Support Street, Connaught Place, New Delhi, 110001' },
    pincodes: { residential: '110001' }
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
                password: "Vikas@129229", // All users get a default password
                displayName: user.name,
                emailVerified: true,
                disabled: user.status === 'deactivated' || user.status === 'suspended',
            });
            userUIDs[user.email] = userRecord.uid;
            console.log(`- Created auth user: ${user.email} (UID: ${userRecord.uid})`);
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                 const userRecord = await adminAuth.getUserByEmail(user.email);
                 userUIDs[user.email] = userRecord.uid;
                 // Ensure password is set for existing user, in case it was created without one
                 await adminAuth.updateUser(userRecord.uid, { password: 'Vikas@129229', disabled: user.status === 'deactivated' || user.status === 'suspended' });
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
        
        if (user.suspensionEndDate) {
            firestoreUserData.suspensionEndDate = Timestamp.fromDate(new Date(user.suspensionEndDate as Date));
        }
        
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
    const platinumInstallerUID = uids[mockUsers[8].email];
    
    if (!jobGiverUID || !installerUID || !justInstallerUID || !newJobGiverUID || !platinumInstallerUID) {
        throw new Error("Required mock users not found for seeding jobs.");
    }
    
    const refs = {
        jobGiver: adminDb.doc('users/' + jobGiverUID),
        installer: adminDb.doc('users/' + installerUID),
        justInstaller: adminDb.doc('users/' + justInstallerUID),
        newJobGiver: adminDb.doc('users/' + newJobGiverUID),
        platinumInstaller: adminDb.doc('users/' + platinumInstallerUID),
    };

    const now = new Date();
    
    // --- JOB 1: Open for Bidding ---
    const job1Id = "JOB-20240720-A1B2";
    const job1Ref = adminDb.collection('jobs').doc(job1Id);
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
        deadline: Timestamp.fromDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)), // 5 days from now
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)), // 4 days ago
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)), // 10 days from now
        bids: [
            {
                installer: refs.installer,
                amount: 22500,
                timestamp: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
                coverLetter: "I'm a Gold-tier installer with 5 years of experience in large commercial projects. I can start next week and ensure a clean, professional installation."
            }
        ], 
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
        bids: [{ installer: refs.installer, amount: 52000, timestamp: Timestamp.fromDate(new Date('2024-06-03')), coverLetter: "I have extensive experience with large-scale factory installations and can complete this overhaul efficiently. My team is certified in Hikvision products."}],
        bidderIds: [installerUID],
        rating: 5,
        completionOtp: "543210",
        comments: [],
        privateMessages: [],
    });

    // --- JOB 3: In Progress ---
    const job3Id = "JOB-20240718-E5F6";
    const job3DisputeId = "DISPUTE-1721981880001";
    await adminDb.collection('jobs').doc(job3Id).set({
        id: job3Id,
        title: "Residential Villa - 4 PTZ Cameras (Disputed)",
        description: "Installation of 4 outdoor PTZ cameras for a 2-story villa. Requires weather-proof cabling and connection to a cloud-based storage service.",
        jobGiver: refs.jobGiver,
        location: "400049",
        fullAddress: 'Villa 17, Juhu Tara Road, Juhu, Mumbai, 400049',
        address: { house: 'Villa 17', street: 'Juhu Tara Road', cityPincode: '400049, Juhu S.O' },
        budget: { min: 8000, max: 12000 },
        status: "In Progress",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
        awardedInstaller: refs.justInstaller,
        bids: [{ installer: refs.justInstaller, amount: 8500, timestamp: Timestamp.fromDate(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)), coverLetter: "I can handle this residential installation quickly and cleanly." }],
        bidderIds: [justInstallerUID],
        comments: [],
        privateMessages: [],
        completionOtp: "987123",
        disputeId: job3DisputeId
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
        deadline: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
        bids: [],
        bidderIds: [],
        comments: [],
        privateMessages: [],
        completionOtp: "112233",
    });
    
    // --- JOB 5: Bidding Closed, Awaiting Award ---
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
        status: "Bidding Closed",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 1 * 60 * 60 * 1000)), // 1 hour ago
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
        bids: [
            { installer: refs.installer, amount: 7000, timestamp: Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000)), coverLetter: "Gold installer, ready to start immediately." },
            { installer: refs.justInstaller, amount: 6500, timestamp: Timestamp.fromDate(new Date(now.getTime() - 12 * 60 * 60 * 1000)), coverLetter: "I'm available this weekend and have experience with Hikvision." }
        ],
        bidderIds: [installerUID, justInstallerUID],
        comments: [],
        privateMessages: [],
        completionOtp: "445566",
    });

    // --- JOB 6: Awarded, Awaiting Acceptance ---
    const job6Id = "JOB-20240728-M3N4";
    await adminDb.collection('jobs').doc(job6Id).set({
        id: job6Id,
        title: "Warehouse Access Control System - Jogeshwari",
        description: "We are looking for a certified installer to set up a biometric access control system for our warehouse in Jogeshwari East. The system needs to cover 3 entry points.",
        jobGiver: refs.jobGiver,
        location: "400063", // Matches installer@example.com's office pincode
        address: { house: 'Gala No. 12', street: 'Prime Industrial Estate', cityPincode: '400063, Jogeshwari East S.O' },
        budget: { min: 15000, max: 22000 },
        status: "Awarded",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
        bids: [{ installer: refs.installer, amount: 19000, timestamp: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), coverLetter: "Experienced with access control systems. Ready to proceed." }],
        bidderIds: [installerUID],
        awardedInstaller: refs.installer,
        acceptanceDeadline: Timestamp.fromDate(new Date(now.getTime() + 23 * 60 * 60 * 1000)), // 23 hours left
        comments: [],
        privateMessages: [],
        completionOtp: "778899",
    });

    // --- JOB 7: Cancelled Job ---
    const job7Id = "JOB-20240729-P5Q6";
    await adminDb.collection('jobs').doc(job7Id).set({
        id: job7Id,
        title: "Cancelled: Home Security Camera Setup",
        description: "Need a reliable installer to set up a 4-camera system for a 2BHK apartment. Should include DVR setup and mobile viewing configuration. Hardware will be provided by me.",
        jobGiver: refs.newJobGiver,
        location: "400053", // Matches installer@example.com's residential pincode
        fullAddress: 'A-501, Star Tower, S.V. Road, Andheri West, Mumbai, 400053',
        address: { house: 'A-501, Star Tower', street: 'S.V. Road, Andheri West', cityPincode: '400053, Andheri West S.O' },
        budget: { min: 5000, max: 8000 },
        status: "Cancelled",
        deadline: Timestamp.fromDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)),
        bids: [],
        bidderIds: [],
        comments: [],
        privateMessages: [],
        completionOtp: "101112",
    });
    
    // --- JOB 8: High Value Job for Platinum Installer ---
    const job8Id = "JOB-20240801-R7S8";
    await adminDb.collection('jobs').doc(job8Id).set({
        id: job8Id,
        title: "Corporate Tower - Full Fiber Optic CCTV Network",
        description: "Full design and implementation of a fiber optic CCTV network for a 20-story corporate tower at Marine Drive. Requires expertise in fiber, VMS, and thermal cameras. Only highly experienced installers should bid.",
        jobGiver: refs.newJobGiver,
        location: "400002",
        fullAddress: 'Corporate Tower, Marine Drive, Mumbai, 400002',
        address: { house: 'Corporate Tower', street: 'Marine Drive', cityPincode: '400002, Kalbadevi S.O' },
        budget: { min: 150000, max: 250000 },
        status: "Open for Bidding",
        deadline: Timestamp.fromDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date()),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)),
        bids: [
             { installer: refs.platinumInstaller, amount: 220000, timestamp: Timestamp.fromDate(new Date()), coverLetter: "As a Platinum installer specializing in large-scale enterprise solutions, my team is perfectly equipped for this project. We have extensive experience with fiber optic networks and VMS integration." }
        ],
        bidderIds: [platinumInstallerUID],
        comments: [],
        privateMessages: [],
        completionOtp: "334455",
    });


    console.log(`- Committed 8 jobs.`);
}

async function seedDisputes(uids: { [email: string]: string }) {
    console.log('\nCreating disputes...');
    const adminUID = uids[mockUsers[0].email];
    const jobGiverUID = uids[mockUsers[1].email];
    const installerUID = uids[mockUsers[2].email];
    const justInstallerUID = uids[mockUsers[3].email];
    const supportUID = uids[mockUsers[9].email];

    if (!adminUID || !jobGiverUID || !installerUID || !justInstallerUID || !supportUID) {
        throw new Error("Required mock users not found for seeding disputes.");
    }
    
    // --- DISPUTE 1: Resolved by Admin ---
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
            { authorId: adminUID, authorRole: 'Admin', content: "It seems to be a misunderstanding. Job Giver, please confirm the payment release. Closing this dispute.", timestamp: Timestamp.fromDate(new Date('2024-07-21T12:00:00Z')) },
        ],
        resolution: "Resolved amicably. Payment was delayed due to oversight.",
        createdAt: Timestamp.fromDate(new Date('2024-07-20T10:00:00Z')),
        resolvedAt: Timestamp.fromDate(new Date('2024-07-21T12:01:00Z')),
    });
    
     // --- DISPUTE 2: Open ---
    const dispute2Id = "DISPUTE-1721981880001";
    await adminDb.collection('disputes').doc(dispute2Id).set({
        id: dispute2Id,
        requesterId: jobGiverUID,
        category: "Job Dispute",
        title: "Dispute for job: Residential Villa - 4 PTZ Cameras",
        jobId: "JOB-20240718-E5F6",
        jobTitle: "Residential Villa - 4 PTZ Cameras (Disputed)",
        status: 'Open',
        reason: "The installer damaged my property during the installation. One of the camera mount points has cracked the wall plaster. The installer is refusing to fix it.",
        parties: { jobGiverId: jobGiverUID, installerId: justInstallerUID },
        messages: [
            { authorId: jobGiverUID, authorRole: 'Job Giver', content: "The wall is cracked and the installer is not taking responsibility. I have attached photos.", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000)) },
            { authorId: justInstallerUID, authorRole: 'Installer', content: "The crack was pre-existing. I pointed it out before I started drilling. This is an attempt to avoid full payment.", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000)) },
        ],
        createdAt: Timestamp.fromDate(new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000)),
    });

    // --- DISPUTE 3: Under Review by Support Team ---
    const dispute3Id = "DISPUTE-1721981880002";
    await adminDb.collection('disputes').doc(dispute3Id).set({
        id: dispute3Id,
        requesterId: justInstallerUID,
        category: "Billing Inquiry",
        title: "Question about commission fee",
        jobId: "JOB-20240718-E5F6",
        jobTitle: "Residential Villa - 4 PTZ Cameras (Disputed)",
        status: 'Under Review',
        reason: "I was charged a higher commission fee than I expected on my last payout. Can you please clarify the calculation?",
        parties: { jobGiverId: jobGiverUID, installerId: justInstallerUID },
        messages: [
            { authorId: justInstallerUID, authorRole: 'Installer', content: "My payout was less than expected, can someone check the commission?", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000))},
            { authorId: supportUID, authorRole: 'Support Team', content: "Hi Ravi, I'm looking into this for you now. I'll check the transaction records and get back to you shortly.", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000))},
        ],
        createdAt: Timestamp.fromDate(new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000)),
    });
    
    console.log(`- Committed 3 disputes.`);
}

async function seedBlacklist() {
    console.log('\nSeeding blacklist...');
    const suspendedInstallerUID = (await adminAuth.getUserByEmail('sanjay.v@example.com')).uid;
    
    const blacklistEntry: BlacklistEntry = {
      id: `BL-USER-${Date.now()}`,
      type: "user",
      value: suspendedInstallerUID,
      role: 'Installer',
      reason: 'Account suspended due to multiple policy violations and user complaints.',
      createdAt: Timestamp.now(),
    };
    await adminDb.collection('blacklist').doc(blacklistEntry.id).set(blacklistEntry);

    const pincodeEntry: BlacklistEntry = {
      id: `BL-PINCODE-${Date.now()}`,
      type: "pincode",
      value: "999999",
      role: 'Any',
      reason: 'High rate of fraudulent activity reported from this pincode.',
      createdAt: Timestamp.now(),
    };
    await adminDb.collection('blacklist').doc(pincodeEntry.id).set(pincodeEntry);

    console.log('- Committed 2 blacklist entries.');
}

async function seedTransactions(uids: { [email: string]: string }) {
    console.log('\nSeeding transactions...');
    const batch = adminDb.batch();

    // Transaction for Completed Job (job2Id)
    const t1: Transaction = {
        id: `TXN-${Date.now()}-1`,
        jobId: "JOB-20240615-C3D4",
        jobTitle: "Factory Security System Overhaul - 32 Cameras",
        payerId: uids[mockUsers[1].email],
        payerName: mockUsers[1].name,
        payeeId: uids[mockUsers[2].email],
        payeeName: mockUsers[2].name,
        amount: 52000,
        status: 'Released',
        createdAt: Timestamp.fromDate(new Date('2024-06-03T10:00:00Z')),
        fundedAt: Timestamp.fromDate(new Date('2024-06-03T10:05:00Z')),
        releasedAt: Timestamp.fromDate(new Date('2024-07-22T14:00:00Z')),
    };
    batch.set(adminDb.collection('transactions').doc(t1.id), t1);

    // Transaction for In-Progress Job (job3Id) - Funded but not released
    const t2: Transaction = {
        id: `TXN-${Date.now()}-2`,
        jobId: "JOB-20240718-E5F6",
        jobTitle: "Residential Villa - 4 PTZ Cameras (Disputed)",
        payerId: uids[mockUsers[1].email],
        payerName: mockUsers[1].name,
        payeeId: uids[mockUsers[3].email],
        payeeName: mockUsers[3].name,
        amount: 8500,
        status: 'Funded',
        createdAt: Timestamp.fromDate(new Date(new Date().getTime() - 8 * 24 * 60 * 60 * 1000)),
        fundedAt: Timestamp.fromDate(new Date(new Date().getTime() - 8 * 24 * 60 * 60 * 1000 + 5*60*1000)),
    };
    batch.set(adminDb.collection('transactions').doc(t2.id), t2);
    
    await batch.commit();
    console.log(`- Committed 2 transactions.`);
}


async function clearAllCollections() {
    const collections = ['disputes', 'jobs', 'users', 'blacklist', 'coupons', 'subscriptionPlans', 'transactions'];
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

    // Seed Transactions
    await seedTransactions(userUIDs);

    console.log('\nDatabase seeding completed successfully! ✅');
  } catch (e) {
      console.error('\nAn error occurred during database seeding:', e);
      process.exit(1);
  }
}

main();
