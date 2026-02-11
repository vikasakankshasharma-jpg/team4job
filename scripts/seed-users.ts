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
console.log('CWD:', process.cwd());
console.log('Env Path:', envPath);
console.log('Firebase Env Keys:', Object.keys(process.env).filter(k => k.includes('FIREBASE')));
console.log('- DO_FIREBASE_PROJECT_ID:', process.env.DO_FIREBASE_PROJECT_ID);
console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('- FIREBASE_PRIVATE_KEY Length:', process.env.FIREBASE_PRIVATE_KEY?.length);


// Initialize Firebase Admin
if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.DO_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.DO_FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || process.env.DO_FIREBASE_PRIVATE_KEY;

    if (!privateKeyRaw) {
        console.error('❌ FIREBASE_PRIVATE_KEY (or DO_FIREBASE_PRIVATE_KEY) is missing. Check .env.local');
        process.exit(1);
    }

    try {
        const privateKey = privateKeyRaw.includes('\\n')
            ? privateKeyRaw.replace(/\\n/g, '\n')
            : privateKeyRaw;

        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
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
        email: 'giver_vip_v3@team4job.com',
        password: 'Test@1234',
        displayName: 'Test Job Giver V3',
        role: 'Job Giver',
        profileData: {
            userType: 'Job Giver',
            firstName: 'Job',
            lastName: 'Giver',
            phone: '9999999991',
            createdAt: new Date().toISOString(),
        }
    },
    {
        email: 'installer_pro_v3@team4job.com',
        password: 'Test@1234',
        displayName: 'Test Installer V3',
        role: 'Installer',
        profileData: {
            userType: 'Installer',
            firstName: 'Installer',
            lastName: 'Pro',
            phone: '9999999992',
            aadharNumber: '999999990019',
            isVerified: true,
            skills: ['CCTV', 'Wiring'],
            createdAt: new Date().toISOString(),
            payouts: { beneficiaryId: 'test_beneficiary_id_123' },
            installerProfile: {
                tier: 'Bronze',
                verified: true,
                skills: ['CCTV', 'Wiring']
            }
        }
    },
    {
        email: 'vikasakankshasharma_v3@gmail.com',
        password: 'Vks2bhdj@9229',
        displayName: 'Vikas Sharma Admin',
        role: 'Admin',
        profileData: {
            userType: 'Admin',
            firstName: 'Vikas',
            lastName: 'Sharma',
            phone: '9999999993',
            createdAt: new Date().toISOString(),
            roles: ['Admin'] // Explicitly adding roles array for admin as per rules
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

            await userRef.set({
                uid: uid,
                email: user.email,
                displayName: user.displayName,
                roles: [user.role],
                ...user.profileData
            }, { merge: true });
            console.log(`📝 Updated Firestore Profile for ${user.email}`);


        } catch (error) {
            console.error(`❌ Error seeding ${user.email}:`, error);
        }
    }
    console.log('🏁 Seeding complete.');
}

seed().catch(console.error);
