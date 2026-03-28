import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 1. Load Environment Variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.DO_FIREBASE_PROJECT_ID;
const clientEmail = process.env.DO_FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Error: Missing Firebase credentials in .env.local');
    process.exit(1);
}

// Ensure NOT connecting to emulator
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.NEXT_PUBLIC_USE_EMULATOR;

// Initialize Admin App
const app = initializeApp({
    credential: cert({
        projectId,
        clientEmail,
        privateKey,
    }),
    projectId,
});

const auth = getAuth(app);
const db = getFirestore(app);

// 3. User Data
const getTestPassword = () => 'TestUser_2026!';
const getAdminPassword = () => 'Vikas@129229';

const TEST_USERS = [
    {
        name: 'Rajesh Kumar',
        email: 'rajesh.client@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000001',
        status: 'active',
        address: { house: '12A, Sunrise Apartments', street: 'MG Road, Indiranagar', landmark: 'Near Metro Station', cityPincode: '560038' },
        pincodes: { residential: '560038' },
    },
    {
        name: 'Priya Sharma',
        email: 'priya.client@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000002',
        status: 'active',
        address: { house: 'Shop 5, Ground Floor', street: 'Commercial Street, Koramangala', landmark: 'Opposite Forum Mall', cityPincode: '560034' },
        pincodes: { residential: '560034' },
    },
    {
        name: 'Amit Patel',
        email: 'amit.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000003',
        status: 'active',
        professionalProfile: {
            verified: true, tier: 'Silver', rating: 4.5, reviews: 8, points: 350,
            skills: ['Security & Surveillance', 'CCTV Installation', 'Wiring'],
            reputationHistory: [],
        },
        address: { house: '23, Vijay Nagar', street: 'BTM Layout', landmark: 'Near Silk Board Junction', cityPincode: '560029' },
        pincodes: { residential: '560029' },
        aadharLast4: '4567', panNumber: 'ABCDE1234F', isPanVerified: true,
    },
    {
        name: 'Suresh Reddy',
        email: 'suresh.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000004',
        status: 'active',
        professionalProfile: {
            verified: true, tier: 'Gold', rating: 4.9, reviews: 45, points: 2200,
            skills: ['Electrical Systems', 'Smart Home Automation', 'Networking', 'Fire Alarm Systems'],
            reputationHistory: [],
        },
        payouts: { beneficiaryId: 'BENE_SURESH_001', accountHolderName: 'Suresh Reddy', accountNumberMasked: '**** 7890', ifsc: 'HDFC0001234' },
        address: { house: '45, Laxmi Colony', street: 'Whitefield Main Road', landmark: 'Near ITPL', cityPincode: '560066' },
        pincodes: { residential: '560066' },
        aadharLast4: '8901', panNumber: 'FGHIJ5678K', isPanVerified: true,
    },
    {
        name: 'Neha Gupta',
        email: 'neha.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000005',
        status: 'active',
        professionalProfile: { verified: false, tier: 'Bronze', rating: 0, reviews: 0, points: 0, skills: ['Plumbing', 'General Maintenance'], reputationHistory: [] },
        address: { house: '7B, Tulsi Apartments', street: 'HSR Layout Sector 1', landmark: 'Near Agara Lake', cityPincode: '560102' },
        pincodes: { residential: '560102' },
    },
    {
        name: 'Vikram Singh',
        email: 'vikasakankshasharma@gmail.com',
        password: getAdminPassword(),
        roles: ['Admin'],
        mobile: '9772699395',
        status: 'active',
        address: { house: 'Office 301, Tech Park', street: 'Outer Ring Road, Marathahalli', landmark: 'Near Bridge', cityPincode: '560037' },
        pincodes: { residential: '560037' },
    },
    {
        name: 'Anita Desai',
        email: 'anita.dual@team4job.com',
        password: getTestPassword(),
        roles: ['Client', 'Professional'],
        mobile: '9100000007',
        status: 'active',
        professionalProfile: { verified: true, tier: 'Silver', rating: 4.6, reviews: 15, points: 600, skills: ['Interior Design', 'Painting', 'General Carpentry'], reputationHistory: [] },
        address: { house: '18, Rose Garden', street: 'Jayanagar 4th Block', landmark: 'Near Cool Joint', cityPincode: '560041' },
        pincodes: { residential: '560041' },
        aadharLast4: '2345', panNumber: 'KLMNO9012P', isPanVerified: true,
    },
    {
        name: 'Manoj Tiwari',
        email: 'manoj.suspended@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000008',
        status: 'suspended',
        professionalProfile: { verified: true, tier: 'Bronze', rating: 2.1, reviews: 3, points: 50, skills: ['Wiring', 'System Setup'], reputationHistory: [] },
        address: { house: '99, Old Town', street: 'Malleshwaram', landmark: 'Near Bus Stand', cityPincode: '560003' },
        pincodes: { residential: '560003' },
    },
    {
        name: 'Kavita Joshi',
        email: 'kavita.support@team4job.com',
        password: getTestPassword(),
        roles: ['Support Team'],
        mobile: '9100000009',
        status: 'active',
        address: { house: 'Floor 2, Building B', street: 'Electronic City Phase 1', landmark: 'Near Infosys Gate', cityPincode: '560100' },
        pincodes: { residential: '560100' },
    },
    {
        name: 'Ravi Verma',
        email: 'ravi.newclient@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000010',
        status: 'active',
        address: { house: '3, Palm Residency', street: 'Sarjapur Road', landmark: 'Near Wipro Gate', cityPincode: '560035' },
        pincodes: { residential: '560035' },
    },
];

async function run() {
    console.log('--- STARTING SUPER SEED (PRODUCTION) ---');

    // 4. Delete EXISTING Users from Auth
    console.log('Cleaning up existing Auth users...');
    let listUsersResult = await auth.listUsers(1000);
    while (listUsersResult.users.length > 0) {
        const uids = listUsersResult.users.map(u => u.uid);
        await auth.deleteUsers(uids);
        console.log(`Deleted ${uids.length} users from Auth.`);
        if (listUsersResult.pageToken) {
            listUsersResult = await auth.listUsers(1000, listUsersResult.pageToken);
        } else {
            break;
        }
    }

    // 5. Delete Firestore Users collection
    console.log('Cleaning up Firestore users collection...');
    const usersSnapshot = await db.collection('users').get();
    const batchSize = 500;
    for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        usersSnapshot.docs.slice(i, i + batchSize).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
    console.log(`Deleted ${usersSnapshot.docs.length} documents from Firestore users.`);

    // 6. Create NEW Users
    console.log('Creating 10 new test users...');
    const now = Timestamp.now();
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 30);

    for (const user of TEST_USERS) {
        // Create Auth User
        const record = await auth.createUser({
            email: user.email,
            password: user.password,
            displayName: user.name,
            emailVerified: true,
        });

        // Create Firestore Doc
        const docData = {
            id: record.uid,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            isMobileVerified: true,
            isEmailVerified: true,
            roles: user.roles,
            status: user.status,
            address: user.address,
            pincodes: user.pincodes,
            kycStatus: (user as any).professionalProfile?.verified ? 'verified' : 'pending',
            professionalProfile: (user as any).professionalProfile,
            payouts: (user as any).payouts,
            aadharLast4: (user as any).aadharLast4,
            panNumber: (user as any).panNumber,
            isPanVerified: (user as any).isPanVerified,
            subscription: { planId: 'trial', planName: 'Free Trial', expiresAt: Timestamp.fromDate(trialExpiry) },
            memberSince: now, createdAt: now, updatedAt: now, lastLoginAt: now, lastActiveAt: now,
        };

        // Remove undefined
        Object.keys(docData).forEach(k => (docData as any)[k] === undefined && delete (docData as any)[k]);

        await db.collection('users').doc(record.uid).set(docData);
        console.log(`Created user: ${user.name} (${user.email})`);
    }

    console.log('--- SUPER SEED COMPLETED SUCCESSFULLY ---');
}

run().catch(e => {
    console.error('SEED FAILED:', e);
    process.exit(1);
});
