

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
import { ReadStream } from 'fs';
import * as fs from 'fs';
import * as path from 'path';

// ... existing imports ...
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { User, Job, Dispute, BlacklistEntry, Transaction, SubscriptionPlan } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { config } from 'dotenv';

config({ path: '.env.production' }); // Load production env vars as base
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: true }); // Override with .env.local
    /* console.log stripped */
}

// --- Firebase Admin SDK Initialization ---

// let firebaseApp: App; // Removed global variable

function initializeFirebaseAdmin(): App {
    // 1. Try to use service-account.json first
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            const app = initializeApp({
                credential: cert(serviceAccount)
            });
            return app;
        }
    } catch (error: any) {
        // Continue to next method
    }

    // 2. If file not found, try to use environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            const app = initializeApp({
                credential: cert(serviceAccount)
            });
            return app;
        } catch (error: any) {
            // Continue to next method
        }
    }

    // 3. Try separate env vars (from .env.production)
    if (process.env.DO_FIREBASE_CLIENT_EMAIL && process.env.DO_FIREBASE_PRIVATE_KEY) {
        try {
            const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            if (!projectId) throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");

            const app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
                    privateKey
                })
            });
            return app;
        } catch (error: any) {
            // Continue to fatal exit
        }
    }

    // 4. If neither method works, exit
    console.error('[Seed] FATAL: Firebase Admin init failed. Run: firebase console → Service Accounts → Generate new key → save to src/lib/firebase/service-account.json');
    process.exit(1);
}

const firebaseApp = initializeFirebaseAdmin();


const adminDb = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);


// --- Mock Data Definition ---

const mockUsers: any[] = [
    { // 0: Admin
        name: 'Admin User',
        email: 'admin@team4job.com',
        mobile: '9999999999',
        roles: ['Admin'],
        status: 'active',
        memberSince: new Date('2024-01-01'),
        avatarUrl: PlaceHolderImages[0].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/admin/200/200',
        address: { house: '1', street: 'Admin Lane', cityPincode: '110001, Connaught Place S.O', fullAddress: '1 Admin Lane, Connaught Place, New Delhi, 110001' },
        district: 'New Delhi',
        pincodes: { residential: '110001' },
        isMobileVerified: true
    },
    { // 1: Client
        name: 'Priya Singh',
        email: 'client@example.com',
        mobile: '9876543210',
        roles: ['Client'],
        status: 'active',
        memberSince: new Date('2024-02-10'),
        avatarUrl: PlaceHolderImages[1].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/priya/200/200',
        address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O', fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001' },
        district: 'Bengaluru',
        pincodes: { residential: '560001' },
        isMobileVerified: true
    },
    { // 2: Dual Role (Professional/Client)
        name: 'Vikram Kumar',
        email: 'Professional@example.com',
        mobile: '8765432109',
        roles: ['Professional', 'Client'],
        status: 'active',
        memberSince: new Date(), // Use current date to prevent auto-deactivation
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        avatarUrl: PlaceHolderImages[2].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/vikram/200/200',
        address: { house: '42/C', street: 'Link Road', cityPincode: '400053, Andheri West S.O', fullAddress: '42/C, Link Road, Andheri West, Mumbai, 400053' },
        district: 'Mumbai',
        pincodes: { residential: '400053', office: '400063' },
        professionalProfile: {
            tier: 'Gold',
            points: 1250,
            skills: ['system installation', 'security systems', 'cabling', 'troubleshooting', 'configuration', 'system management'],
            rating: 4.8,
            reviews: 25,
            verified: true,
            reputationHistory: [
                { month: 'Jan', points: 100 }, { month: 'Feb', points: 350 }, { month: 'Mar', points: 600 },
                { month: 'Apr', points: 800 }, { month: 'May', points: 1050 }, { month: 'Jun', points: 1250 },
            ]
        },
        payouts: { beneficiaryId: 'test_beneficiary_id_123' },
        isMobileVerified: true,
        subscription: {
            planId: 'pro',
            status: 'active',
            startDate: new Date(),
            expiresAt: new Date('2030-12-31'), // Future date to prevent expiration
            autoRenew: true
        }
    },
    { // 3: Professional Only
        name: 'Ravi Kumar',
        email: 'just-Professional@example.com',
        mobile: '7654321098',
        roles: ['Professional'],
        status: 'active',
        memberSince: new Date('2024-04-01'),
        avatarUrl: PlaceHolderImages[3].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/ravi/200/200',
        address: { house: 'Plot 88', street: 'Sector 18', cityPincode: '122022, Gurgaon S.O', fullAddress: 'Plot 88, Sector 18, Gurgaon, Haryana, 122022' },
        district: 'Gurgaon',
        pincodes: { residential: '122022' },
        professionalProfile: {
            tier: 'Bronze',
            points: 150,
            skills: ['system setup', 'cabling', 'troubleshooting'],
            rating: 4.5,
            reviews: 5,
            verified: true,
            reputationHistory: [
                { month: 'Apr', points: 50 }, { month: 'May', points: 100 }, { month: 'Jun', points: 150 },
            ]
        },
        isMobileVerified: true
    },
    { // 4: New Client
        name: 'Sunita Gupta',
        email: 'sunita.g@example.com',
        mobile: '9123456789',
        roles: ['Client'],
        status: 'active',
        memberSince: new Date('2024-05-20'),
        avatarUrl: PlaceHolderImages[4].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/sunita/200/200',
        address: { house: 'Flat 101', street: 'Koregaon Park', cityPincode: '411001, Pune S.O', fullAddress: 'Flat 101, Koregaon Park, Pune, 411001' },
        district: 'Pune',
        pincodes: { residential: '411001' },
        isMobileVerified: true
    },
    { // 5: New Professional
        name: 'Arjun Singh',
        email: 'arjun.s@example.com',
        mobile: '9988776655',
        roles: ['Professional'],
        status: 'active',
        memberSince: new Date('2024-06-01'),
        avatarUrl: PlaceHolderImages[5].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/arjun/200/200',
        address: { house: '15/A', street: 'Salt Lake', cityPincode: '700091, Salt Lake S.O', fullAddress: '15/A, Salt Lake, Kolkata, 700091' },
        district: 'Kolkata',
        pincodes: { residential: '700091' },
        professionalProfile: {
            tier: 'Bronze',
            points: 50,
            skills: ['wiring', 'system setup'],
            rating: 0,
            reviews: 0,
            verified: true,
            reputationHistory: [],
        },
        isMobileVerified: true
    },
    { // 6: Unverified Professional
        name: 'Anil Kapoor',
        email: 'anil.k@example.com',
        mobile: '9898989898',
        roles: ['Professional'],
        status: 'active',
        memberSince: new Date('2024-02-15'),
        avatarUrl: PlaceHolderImages[6].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/anil/200/200',
        address: { house: '7, Janpath', street: 'Connaught Place', cityPincode: '110001, Connaught Place S.O', fullAddress: '7, Janpath, Connaught Place, New Delhi, 110001' },
        district: 'New Delhi',
        pincodes: { residential: '110001' },
        professionalProfile: {
            tier: 'Bronze',
            points: 25,
            skills: ['system setup', 'troubleshooting'],
            rating: 2.5,
            reviews: 4,
            verified: false,
            reputationHistory: [],
        },
        isMobileVerified: false
    },
    { // 7: Suspended Professional
        name: 'Sanjay Verma',
        email: 'sanjay.v@example.com',
        mobile: '9797979797',
        roles: ['Professional'],
        status: 'suspended',
        suspensionEndDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        memberSince: new Date('2024-03-01'),
        avatarUrl: PlaceHolderImages[7].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/sanjay/200/200',
        address: { house: 'House 55', street: 'Sector 22', cityPincode: '160022, Sector 22 S.O', fullAddress: 'House 55, Sector 22, Chandigarh, 160022' },
        district: 'Chandigarh',
        pincodes: { residential: '160022' },
        professionalProfile: {
            tier: 'Silver',
            points: 600,
            skills: ['management software', 'access control'],
            rating: 3.1,
            reviews: 12,
            verified: true,
            reputationHistory: [],
        },
        isMobileVerified: true
    },
    { // 8: Platinum Professional
        name: 'Deepika Rao',
        email: 'deepika.r@example.com',
        mobile: '9696969696',
        roles: ['Professional'],
        status: 'active',
        memberSince: new Date('2023-01-20'),
        avatarUrl: PlaceHolderImages[0].imageUrl,
        realAvatarUrl: 'https://picsum.photos/seed/deepika/200/200',
        address: { house: 'Penthouse A', street: 'Marine Drive', cityPincode: '400002, Kalbadevi S.O', fullAddress: 'Penthouse A, Marine Drive, Mumbai, 400002' },
        district: 'Mumbai',
        pincodes: { residential: '400002' },
        professionalProfile: {
            tier: 'Platinum',
            points: 2500,
            skills: ['system installation', 'server setup', 'cabling', 'troubleshooting', 'configuration', 'system management', 'fiber optics', 'advanced sensors', 'access control'],
            rating: 4.9,
            reviews: 55,
            verified: true,
            reputationHistory: [],
        },
        isMobileVerified: true
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
        district: 'New Delhi',
        pincodes: { residential: '110001' },
        isMobileVerified: true
    },
];


// --- Seeding Functions ---

async function clearCollection(collectionPath: string) {
    const collectionRef = adminDb.collection(collectionPath);
    const snapshot = await collectionRef.limit(500).get();
    if (snapshot.empty) {
        return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size === 500) {
        await clearCollection(collectionPath);
    } else {
    }
}

async function clearAuthUsers() {
    try {
        const listUsersResult = await adminAuth.listUsers(1000);
        if (listUsersResult.users.length === 0) {
            return;
        }
        const uidsToDelete = listUsersResult.users.map(u => u.uid);
        await adminAuth.deleteUsers(uidsToDelete);
        if (listUsersResult.pageToken) {
            await clearAuthUsers();
        }
    } catch (error) {
        // Error
    }
}

async function seedAuthAndGetUIDs(users: any[]) {
    const userUIDs: { [email: string]: string } = {};
    for (const user of users) {
        try {
            const userRecord = await adminAuth.createUser({
                email: user.email,
                password: "Test@1234", // All users get a default password
                displayName: user.name,
                emailVerified: true,
                disabled: user.status === 'deactivated' || user.status === 'suspended',
            });
            userUIDs[user.email] = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                const userRecord = await adminAuth.getUserByEmail(user.email);
                userUIDs[user.email] = userRecord.uid;
                // Ensure password is set for existing user, in case it was created without one
                await adminAuth.updateUser(userRecord.uid, { password: 'Test@1234', disabled: user.status === 'deactivated' || user.status === 'suspended' });
            } else {
            }
        }
    }
    return userUIDs;
}

async function seedUserProfiles(users: any[], uids: { [email: string]: string }) {
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

        // Seed Public Profile
        const publicProfileRef = adminDb.collection('public_profiles').doc(uid);
        const publicData = {
            id: uid,
            name: user.name,
            avatarUrl: user.avatarUrl,
            realAvatarUrl: user.realAvatarUrl || user.avatarUrl,
            roles: user.roles,
            memberSince: Timestamp.fromDate(new Date(user.memberSince as Date)),
            status: user.status,
            pincodes: user.pincodes || {},
            address: {
                cityPincode: user.address?.cityPincode || '',
            },
            professionalProfile: user.professionalProfile || null,
            district: user.district || null,
        };
        batch.set(publicProfileRef, publicData);
    });
    await batch.commit();
}

async function seedJobsAndSubcollections(uids: { [email: string]: string }) {
    const clientUID = uids[mockUsers[1].email];
    const ProfessionalUID = uids[mockUsers[2].email];
    const justProfessionalUID = uids[mockUsers[3].email];
    const newclientUID = uids[mockUsers[4].email];
    const platinumProfessionalUID = uids[mockUsers[8].email];

    if (!clientUID || !ProfessionalUID || !justProfessionalUID || !newclientUID || !platinumProfessionalUID) {
        throw new Error("Required mock users not found for seeding jobs.");
    }

    const refs = {
        client: adminDb.doc('users/' + clientUID),
        Professional: adminDb.doc('users/' + ProfessionalUID),
        justProfessional: adminDb.doc('users/' + justProfessionalUID),
        newclient: adminDb.doc('users/' + newclientUID),
        platinumProfessional: adminDb.doc('users/' + platinumProfessionalUID),
    };

    const now = new Date();

    // --- JOB 1: Open for Bidding ---
    const job1Id = "JOB-20240720-A1B2";
    const job1Ref = adminDb.collection('jobs').doc(job1Id);
    await job1Ref.set({
        id: job1Id,
        title: "Install 16 Smart Devices for a Commercial Building",
        description: "We require the installation of 16 professional smart devices across our 4-story commercial building in Ashok Nagar, Bengaluru. The job includes device mounting, cabling (Cat6), and central unit configuration. All hardware will be provided.",
        client: refs.client,
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
                Professional: refs.Professional,
                amount: 22500,
                timestamp: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
                coverLetter: "I'm a Gold-tier Professional with 5 years of experience in large commercial projects. I can start next week and ensure a clean, professional installation."
            }
        ],
        bidderIds: [ProfessionalUID],
        comments: [],
        privateMessages: [],
        completionOtp: Math.floor(100000 + Math.random() * 900000).toString(),
    });

    // --- JOB 2: Completed ---
    const job2Id = "JOB-20240615-C3D4";
    await adminDb.collection('jobs').doc(job2Id).set({
        id: job2Id,
        title: "Factory Security System Overhaul - 32 Points",
        description: "Complete overhaul of an existing security system at a factory in Peenya. Requires replacing 32 old units with new professional devices, setting up a new server room with recorders, and integrating with our existing network.",
        client: refs.client,
        location: "560058",
        fullAddress: 'Peenya Industrial Area, Bengaluru, 560058',
        address: { house: 'Plot 42', street: 'Peenya Industrial Area', cityPincode: '560058, Peenya S.O' },
        budget: { min: 45000, max: 60000 },
        status: "Completed",
        deadline: Timestamp.fromDate(new Date('2024-06-10')),
        postedAt: Timestamp.fromDate(new Date('2024-06-01')),
        jobStartDate: Timestamp.fromDate(new Date('2024-06-15')),
        awardedProfessional: refs.Professional,
        bids: [{ Professional: refs.Professional, amount: 52000, timestamp: Timestamp.fromDate(new Date('2024-06-03')), coverLetter: "I have extensive experience with large-scale factory installations and can complete this overhaul efficiently. My team is certified in advanced platform integrations." }],
        bidderIds: [ProfessionalUID],
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
        title: "Residential Villa - 4 Technical Points (Disputed)",
        description: "Installation of 4 outdoor specialized devices for a 2-story villa. Requires weather-proof cabling and connection to a cloud-based service.",
        client: refs.client,
        location: "400049",
        fullAddress: 'Villa 17, Juhu Tara Road, Juhu, Mumbai, 400049',
        address: { house: 'Villa 17', street: 'Juhu Tara Road', cityPincode: '400049, Juhu S.O' },
        budget: { min: 8000, max: 12000 },
        status: "In Progress",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
        awardedProfessional: refs.justProfessional,
        bids: [{ Professional: refs.justProfessional, amount: 8500, timestamp: Timestamp.fromDate(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)), coverLetter: "I can handle this residential installation quickly and cleanly." }],
        bidderIds: [justProfessionalUID],
        comments: [],
        privateMessages: [],
        completionOtp: "987123",
        disputeId: job3DisputeId
    });

    // --- JOB 4: Unbid Job ---
    const job4Id = "JOB-20240722-G7H8";
    await adminDb.collection('jobs').doc(job4Id).set({
        id: job4Id,
        title: "Unbid Job: Small Shop Security Setup",
        description: "Looking for an Professional to set up 2 devices in a small retail shop. Simple setup, hardware provided.",
        client: refs.newclient,
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
        title: "Urgent: Replace 4 Devices at Andheri Office",
        description: "Need an experienced Professional to urgently replace four faulty specialized devices at a corporate office in Andheri West. Must be familiar with security systems. Job needs to be completed this weekend.",
        client: refs.newclient,
        location: "400053", // Matches Professional@example.com's residential pincode
        fullAddress: '5th Floor, Corporate Heights, Andheri West, Mumbai, 400053',
        address: { house: '5th Floor, Corporate Heights', street: 'Veera Desai Road', cityPincode: '400053, Andheri West S.O' },
        budget: { min: 6000, max: 9000 },
        status: "Bidding Closed",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 1 * 60 * 60 * 1000)), // 1 hour ago
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
        bids: [
            { Professional: refs.Professional, amount: 7000, timestamp: Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000)), coverLetter: "Gold Professional, ready to start immediately." },
            { Professional: refs.justProfessional, amount: 6500, timestamp: Timestamp.fromDate(new Date(now.getTime() - 12 * 60 * 60 * 1000)), coverLetter: "I'm available this weekend and have experience with professional security systems." }
        ],
        bidderIds: [ProfessionalUID, justProfessionalUID],
        comments: [],
        privateMessages: [],
        completionOtp: "445566",
    });

    // --- JOB 6: Awarded, Awaiting Acceptance ---
    const job6Id = "JOB-20240728-M3N4";
    await adminDb.collection('jobs').doc(job6Id).set({
        id: job6Id,
        title: "Warehouse Access Control System - Jogeshwari",
        description: "We are looking for a certified Professional to set up a biometric access control system for our warehouse in Jogeshwari East. The system needs to cover 3 entry points.",
        client: refs.client,
        location: "400063", // Matches Professional@example.com's office pincode
        address: { house: 'Gala No. 12', street: 'Prime Industrial Estate', cityPincode: '400063, Jogeshwari East S.O' },
        budget: { min: 15000, max: 22000 },
        status: "Awarded",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
        bids: [{ Professional: refs.Professional, amount: 19000, timestamp: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), coverLetter: "Experienced with access control systems. Ready to proceed." }],
        bidderIds: [ProfessionalUID],
        awardedProfessional: refs.Professional,
        acceptanceDeadline: Timestamp.fromDate(new Date(now.getTime() + 23 * 60 * 60 * 1000)), // 23 hours left
        comments: [],
        privateMessages: [],
        completionOtp: "778899",
    });

    // --- JOB 7: Cancelled Job ---
    const job7Id = "JOB-20240729-P5Q6";
    await adminDb.collection('jobs').doc(job7Id).set({
        id: job7Id,
        title: "Cancelled: Home Security System Setup",
        description: "Need a reliable Professional to set up a 4-point system for a 2BHK apartment. Should include central controller setup and mobile access configuration. Hardware will be provided by me.",
        client: refs.newclient,
        location: "400053", // Matches Professional@example.com's residential pincode
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

    // --- JOB 8: High Value Job for Platinum Professional ---
    const job8Id = "JOB-20240801-R7S8";
    await adminDb.collection('jobs').doc(job8Id).set({
        id: job8Id,
        title: "Corporate Tower - Full Professional Network Infrastructure",
        description: "Full design and implementation of a professional technical network for a 20-story corporate tower at Marine Drive. Requires expertise in networking, system management, and specialized technical sensors. Only highly experienced Professionals should bid.",
        client: refs.newclient,
        location: "400002",
        fullAddress: 'Corporate Tower, Marine Drive, Mumbai, 400002',
        address: { house: 'Corporate Tower', street: 'Marine Drive', cityPincode: '400002, Kalbadevi S.O' },
        budget: { min: 150000, max: 250000 },
        status: "Open for Bidding",
        deadline: Timestamp.fromDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date()),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)),
        bids: [
            { Professional: refs.platinumProfessional, amount: 220000, timestamp: Timestamp.fromDate(new Date()), coverLetter: "As a Platinum Professional specializing in large-scale enterprise solutions, my team is perfectly equipped for this project. We have extensive experience with complex technical networks and integrated platform management." }
        ],
        bidderIds: [platinumProfessionalUID],
        comments: [],
        privateMessages: [],
        completionOtp: "334455",
    });

    // --- JOB 9: Explicit Archived Job for Demo User ---
    const job9Id = "JOB-20240901-ARCH1";
    await adminDb.collection('jobs').doc(job9Id).set({
        id: job9Id,
        title: "Archived: Office System Upgrade",
        description: "Upgraded 8 technical points for a small office. Work was completed on time.",
        client: refs.client, // Explicitly for client@example.com
        location: "560001",
        fullAddress: 'C-20, MG Road, Bengaluru, 560001',
        address: { house: 'C-20', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O' },
        budget: { min: 10000, max: 15000 },
        status: "Completed",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000)),
        awardedProfessional: refs.Professional,
        bids: [{ Professional: refs.Professional, amount: 12000, timestamp: Timestamp.fromDate(new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)), coverLetter: "Experienced Professional." }],
        bidderIds: [ProfessionalUID],
        rating: 5,
        completionOtp: "654321",
        comments: [],
        privateMessages: [],
        archived: true // Ensure archived flag if used
    });

    // --- JOB 10: Explicit Cancelled Job for Demo User ---
    const job10Id = "JOB-20240901-CANC1";
    await adminDb.collection('jobs').doc(job10Id).set({
        id: job10Id,
        title: "Cancelled: Outdoor Device Install",
        description: "Job cancelled due to change in requirements.",
        client: refs.client, // Explicitly for client@example.com
        location: "560001",
        fullAddress: 'D-5, MG Road, Bengaluru, 560001',
        address: { house: 'D-5', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O' },
        budget: { min: 5000, max: 8000 },
        status: "Cancelled",
        deadline: Timestamp.fromDate(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)),
        postedAt: Timestamp.fromDate(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)),
        jobStartDate: Timestamp.fromDate(new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)),
        bids: [],
        bidderIds: [],
        comments: [],
        privateMessages: [],
        completionOtp: "998877",
    });



}

async function seedDisputes(uids: { [email: string]: string }) {
    const adminUID = uids[mockUsers[0].email];
    const clientUID = uids[mockUsers[1].email];
    const ProfessionalUID = uids[mockUsers[2].email];
    const justProfessionalUID = uids[mockUsers[3].email];
    const supportUID = uids[mockUsers[9].email];

    if (!adminUID || !clientUID || !ProfessionalUID || !justProfessionalUID || !supportUID) {
        throw new Error("Required mock users not found for seeding disputes.");
    }

    // --- DISPUTE 1: Resolved by Admin ---
    const dispute1Id = "DISPUTE-1721981880000";
    await adminDb.collection('disputes').doc(dispute1Id).set({
        id: dispute1Id,
        requesterId: ProfessionalUID,
        category: "Job Dispute",
        title: "Dispute for job: Factory System Overhaul",
        jobId: "JOB-20240615-C3D4",
        jobTitle: "Factory Security System Overhaul - 32 Points",
        status: 'Resolved',
        reason: "The client has not released the payment even after the job was marked as complete two weeks ago. The work was finished to their satisfaction.",
        parties: { clientId: clientUID, professionalId: ProfessionalUID },
        messages: [
            { authorId: ProfessionalUID, authorRole: 'Professional', content: "Initial complaint: Payment not released.", timestamp: Timestamp.fromDate(new Date('2024-07-20T10:00:00Z')) },
            { authorId: clientUID, authorRole: 'Client', content: "I was on vacation and missed the notification. Apologies for the delay.", timestamp: Timestamp.fromDate(new Date('2024-07-21T11:00:00Z')) },
            { authorId: adminUID, authorRole: 'Admin', content: "It seems to be a misunderstanding. Client, please confirm the payment release. Closing this dispute.", timestamp: Timestamp.fromDate(new Date('2024-07-21T12:00:00Z')) },
        ],
        resolution: "Resolved amicably. Payment was delayed due to oversight.",
        createdAt: Timestamp.fromDate(new Date('2024-07-20T10:00:00Z')),
        resolvedAt: Timestamp.fromDate(new Date('2024-07-21T12:01:00Z')),
    });

    // --- DISPUTE 2: Open ---
    const dispute2Id = "DISPUTE-1721981880001";
    await adminDb.collection('disputes').doc(dispute2Id).set({
        id: dispute2Id,
        requesterId: clientUID,
        category: "Job Dispute",
        title: "Dispute for job: Residential Villa - 4 Technical Points",
        jobId: "JOB-20240718-E5F6",
        jobTitle: "Residential Villa - 4 Technical Points (Disputed)",
        status: 'Open',
        reason: "The Professional damaged my property during the installation. One of the device mount points has cracked the wall plaster. The Professional is refusing to fix it.",
        parties: { clientId: clientUID, professionalId: justProfessionalUID },
        messages: [
            { authorId: clientUID, authorRole: 'Client', content: "The wall is cracked and the Professional is not taking responsibility. I have attached photos.", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000)) },
            { authorId: justProfessionalUID, authorRole: 'Professional', content: "The crack was pre-existing. I pointed it out before I started drilling. This is an attempt to avoid full payment.", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000)) },
        ],
        createdAt: Timestamp.fromDate(new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000)),
    });

    // --- DISPUTE 3: Under Review by Support Team ---
    const dispute3Id = "DISPUTE-1721981880002";
    await adminDb.collection('disputes').doc(dispute3Id).set({
        id: dispute3Id,
        requesterId: justProfessionalUID,
        category: "Billing Inquiry",
        title: "Question about commission fee",
        jobId: "JOB-20240718-E5F6",
        jobTitle: "Residential Villa - 4 Technical Points (Disputed)",
        status: 'Under Review',
        reason: "I was charged a higher commission fee than I expected on my last payout. Can you please clarify the calculation?",
        parties: { clientId: clientUID, professionalId: justProfessionalUID },
        messages: [
            { authorId: justProfessionalUID, authorRole: 'Professional', content: "My payout was less than expected, can someone check the commission?", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000)) },
            { authorId: supportUID, authorRole: 'Support Team', content: "Hi Ravi, I'm looking into this for you now. I'll check the transaction records and get back to you shortly.", timestamp: Timestamp.fromDate(new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000)) },
        ],
        createdAt: Timestamp.fromDate(new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000)),
    });
}

async function seedBlacklist() {
    const suspendedProfessionalUID = (await adminAuth.getUserByEmail('sanjay.v@example.com')).uid;

    const blacklistEntry: any = {
        id: `BL-USER-${Date.now()}`,
        type: "user",
        value: suspendedProfessionalUID,
        role: 'Professional',
        reason: 'Account suspended due to multiple policy violations and user complaints.',
        createdAt: Timestamp.now(),
    };
    await adminDb.collection('blacklist').doc(blacklistEntry.id).set(blacklistEntry);

    const pincodeEntry: any = {
        id: `BL-PINCODE-${Date.now()}`,
        type: "pincode",
        value: "999999",
        role: 'Any',
        reason: 'High rate of fraudulent activity reported from this pincode.',
        createdAt: Timestamp.now(),
    };
    await adminDb.collection('blacklist').doc(pincodeEntry.id).set(pincodeEntry);
}

async function seedTransactions(uids: { [email: string]: string }) {
    const batch = adminDb.batch();
    const now = new Date();

    // Transaction for Completed Job (job2Id)
    const t1: any = {
        id: `TXN-JOB2-${Date.now()}`,
        jobId: "JOB-20240615-C3D4",
        jobTitle: "Factory System Overhaul",
        payerId: uids[mockUsers[1].email],
        payeeId: uids[mockUsers[2].email],
        amount: 52000,
        travelTip: 0,
        commission: 2600, // 5% of 52000
        clientFee: 1040, // 2% of 52000
        totalPaidByClient: 53040,
        payoutToProfessional: 49400,
        status: 'released',
        createdAt: Timestamp.fromDate(new Date('2024-06-03T10:00:00Z')),
        fundedAt: Timestamp.fromDate(new Date('2024-06-03T10:05:00Z')),
        releasedAt: Timestamp.fromDate(new Date('2024-07-22T14:00:00Z')),
        paymentGatewayOrderId: `cf_order_${Date.now()}-1`,
        payoutTransferId: `payout_${Date.now()}-1`
    };
    batch.set(adminDb.collection('transactions').doc(t1.id), t1);

    // Transaction for In-Progress Job (job3Id) - Funded but not released
    const t2: any = {
        id: `TXN-JOB3-${Date.now()}`,
        jobId: "JOB-20240718-E5F6",
        jobTitle: "Residential Villa - 4 Technical Points (Disputed)",
        payerId: uids[mockUsers[1].email],
        payeeId: uids[mockUsers[3].email],
        amount: 8500,
        travelTip: 0,
        commission: 425, // 5%
        clientFee: 170, // 2%
        totalPaidByClient: 8670,
        payoutToProfessional: 8075,
        status: 'funded',
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)),
        fundedAt: Timestamp.fromDate(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000)),
        paymentGatewayOrderId: `cf_order_${Date.now()}-2`,
    };
    batch.set(adminDb.collection('transactions').doc(t2.id), t2);

    // --- NEW: POPULATED WALLET TRANSACTIONS FOR Professional (User 2) ---
    // Transaction Old 1: Old completed job
    const tOld1: any = {
        id: `TXN-OLD-1-${Date.now()}`,
        jobId: "JOB-OLD-1",
        jobTitle: "Office Network Setup - Phase 1",
        payerId: uids[mockUsers[1].email],
        payeeId: uids[mockUsers[2].email], // Professional
        amount: 15000,
        travelTip: 500,
        commission: 750,
        clientFee: 300,
        totalPaidByClient: 15800,
        payoutToProfessional: 14750,
        status: 'released',
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)),
        fundedAt: Timestamp.fromDate(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)),
        releasedAt: Timestamp.fromDate(new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000)),
    };
    batch.set(adminDb.collection('transactions').doc(tOld1.id), tOld1);

    // Transaction Old 2: Another completed job
    const tOld2: any = {
        id: `TXN-OLD-2-${Date.now()}`,
        jobId: "JOB-OLD-2",
        jobTitle: "Security Maintenance Contract - Q1",
        payerId: uids[mockUsers[1].email],
        payeeId: uids[mockUsers[2].email], // Professional
        amount: 8000,
        travelTip: 0,
        commission: 400,
        clientFee: 160,
        totalPaidByClient: 8160,
        payoutToProfessional: 7600,
        status: 'released',
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
        fundedAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
        releasedAt: Timestamp.fromDate(new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)),
    };
    batch.set(adminDb.collection('transactions').doc(tOld2.id), tOld2);

    // Transaction for Awarded Job (job6Id) - Funded
    const t3: any = {
        id: `TXN-JOB6-${Date.now()}`,
        jobId: "JOB-20240728-M3N4",
        jobTitle: "Warehouse Access Control System - Jogeshwari",
        payerId: uids[mockUsers[1].email],
        payeeId: uids[mockUsers[2].email],
        amount: 19000,
        travelTip: 0,
        commission: 950, // 5%
        clientFee: 380, // 2%
        totalPaidByClient: 19380,
        payoutToProfessional: 18050,
        status: 'funded',
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        fundedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000)),
        paymentGatewayOrderId: `cf_order_${Date.now()}-3`,
    };
    batch.set(adminDb.collection('transactions').doc(t3.id), t3);

    // Transaction for a Failed Payment
    const t4: any = {
        id: `TXN-FAILED-${Date.now()}`,
        jobId: "JOB-20240725-J9K0",
        jobTitle: "Urgent: Replace 4 Devices at Andheri Office",
        payerId: uids[mockUsers[4].email],
        payeeId: uids[mockUsers[3].email],
        amount: 6500,
        travelTip: 0,
        commission: 325, // 5%
        clientFee: 130, // 2%
        totalPaidByClient: 6630,
        payoutToProfessional: 6175,
        status: 'failed',
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
        fundedAt: null,
        failedAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000)),
        paymentGatewayOrderId: `cf_order_${Date.now()}-4`,
    };
    batch.set(adminDb.collection('transactions').doc(t4.id), t4);

    // Transaction for a Refunded payment
    const t5: any = {
        id: `TXN-REFUND-${Date.now()}`,
        jobId: "JOB-SOME-OLD-JOB",
        jobTitle: "Office System Maintenance",
        payerId: uids[mockUsers[1].email],
        payeeId: uids[mockUsers[8].email],
        amount: 5000,
        travelTip: 0,
        commission: 250, // 5%
        clientFee: 100, // 2%
        totalPaidByClient: 5100,
        payoutToProfessional: 4750,
        status: 'refunded',
        createdAt: Timestamp.fromDate(new Date('2024-05-10T10:00:00Z')),
        fundedAt: Timestamp.fromDate(new Date('2024-05-10T10:05:00Z')),
        refundedAt: Timestamp.fromDate(new Date('2024-05-12T16:00:00Z')),
        paymentGatewayOrderId: `cf_order_${Date.now()}-5`,
        refundTransferId: `refund_${Date.now()}-5`,
    };
    batch.set(adminDb.collection('transactions').doc(t5.id), t5);

    await batch.commit();
}

async function seedSubscriptionPlans() {
    const batch = adminDb.batch();

    const proProfessionalPlan: any = {
        id: "pro-Professional-annual",
        name: "Pro Professional (Annual)",
        description: "Unlock premium features for professional Professionals.",
        price: 2999,
        role: "Professional",
        features: ["Lower commission rates", "Priority support", "Appear higher in search"],
        isArchived: false,
    };
    batch.set(adminDb.collection('subscriptionPlans').doc(proProfessionalPlan.id), proProfessionalPlan);

    const businessclientPlan: any = {
        id: "business-job-giver-annual",
        name: "Business Client (Annual)",
        description: "Post unlimited jobs and get access to top-tier Professionals.",
        price: 4999,
        role: "Client",
        features: ["Unlimited job posts", "Advanced analytics", "Directly invite Professionals"],
        isArchived: false,
    };
    batch.set(adminDb.collection('subscriptionPlans').doc(businessclientPlan.id), businessclientPlan);

    await batch.commit();
}


async function clearAllCollections() {
    const collections = ['disputes', 'jobs', 'users', 'blacklist', 'coupons', 'subscriptionPlans', 'transactions', 'settings'];
    for (const collection of collections) {
        await clearCollection(collection);
    }
}


async function main() {
    try {

        // Clear Auth & Firestore
        await clearAuthUsers();
        await clearAllCollections();

        // Seed Auth and get back the real UIDs
        const userUIDs = await seedAuthAndGetUIDs(mockUsers);

        // Seed Firestore Users with the correct UIDs
        await seedUserProfiles(mockUsers, userUIDs);

        // Seed Subscription Plans
        await seedSubscriptionPlans();

        // Seed Jobs with subcollections
        await seedJobsAndSubcollections(userUIDs);

        // Seed Disputes
        await seedDisputes(userUIDs);

        // Seed Blacklist
        await seedBlacklist();

        // Seed Transactions
        await seedTransactions(userUIDs);
    } catch (e) {
        process.exit(1);
    }
}

main();

