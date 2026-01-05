import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading .env.local from:', envPath);
dotenv.config({ path: envPath });

console.log('Checks:');
console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('- FIREBASE_PRIVATE_KEY Length:', process.env.FIREBASE_PRIVATE_KEY?.length);

if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.error('❌ FIREBASE_PRIVATE_KEY is missing. Check .env.local');
    process.exit(1);
}

// Initialize Firebase Admin
if (!getApps().length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.includes('\\n')
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : process.env.FIREBASE_PRIVATE_KEY;

        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    } catch (e) {
        console.error('❌ Error initializing Firebase Admin:', e);
        process.exit(1);
    }
}

const db = getFirestore();
const auth = getAuth();

const TEST_USERS = [
    {
        email: 'jobgiver@example.com',
        password: 'Vikas@129229',
        displayName: 'Test Job Giver',
        role: 'Job Giver',
        profileData: {
            userType: 'Job Giver',
            firstName: 'Test',
            lastName: 'Job Giver',
            phone: '9999999991',
            createdAt: new Date().toISOString(),
        }
    },
    {
        email: 'installer@example.com',
        password: 'Vikas@129229',
        displayName: 'Test Installer',
        role: 'Installer',
        profileData: {
            userType: 'Installer',
            firstName: 'Test',
            lastName: 'Installer',
            phone: '9999999992',
            aadharNumber: '999999990019',
            isVerified: true,
            skills: ['CCTV', 'Wiring'],
            createdAt: new Date().toISOString(),
            payouts: { beneficiaryId: 'test_beneficiary_id_123' }
        }
    },
    {
        email: 'vikasakankshasharma@gmail.com',
        password: 'Vikas@129229',
        displayName: 'Test Admin',
        role: 'Admin',
        profileData: {
            userType: 'Admin',
            firstName: 'Test',
            lastName: 'Admin',
            phone: '9999999993',
            createdAt: new Date().toISOString(),
        }
    }
];

async function seed() {
    console.log('🌱 Seeding test users for Project:', process.env.FIREBASE_PROJECT_ID);

    for (const user of TEST_USERS) {
        let uid;
        try {
            // 1. Check if user exists in Auth
            try {
                const userRecord = await auth.getUserByEmail(user.email);
                uid = userRecord.uid;
                console.log(`✅ User ${user.email} already exists in Auth.`);
            } catch (e: any) {
                if (e.code === 'auth/user-not-found') {
                    // Create user
                    const newUser = await auth.createUser({
                        email: user.email,
                        password: user.password,
                        displayName: user.displayName,
                        emailVerified: true,
                    });
                    uid = newUser.uid;
                    console.log(`✨ Created Auth User: ${user.email}`);
                } else {
                    throw e;
                }
            }

            // 2. Ensure Firestore Profile exists
            const userRef = db.collection('users').doc(uid);
            const doc = await userRef.get();

            if (!doc.exists) {
                await userRef.set({
                    uid: uid,
                    email: user.email,
                    displayName: user.displayName,
                    roles: [user.role],
                    ...user.profileData
                });
                console.log(`📝 Created Firestore Profile for ${user.email}`);
            } else {
                console.log(`✅ Firestore Profile for ${user.email} already exists.`);
            }

        } catch (error) {
            console.error(`❌ Error seeding ${user.email}:`, error);
        }
    }
    console.log('🏁 Seeding complete.');
}

seed().catch(console.error);
