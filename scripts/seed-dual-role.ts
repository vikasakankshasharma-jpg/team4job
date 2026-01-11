import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';

import * as fs from 'fs';

// Load environment variables from .env.local
let envPath = path.resolve(process.cwd(), '.env.local');
const tempEnvPath = path.resolve(process.cwd(), 'temp-env.local');

if (fs.existsSync(tempEnvPath)) {
    console.log('Found temp-env.local, using it directly.');
    envPath = tempEnvPath;
}

console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

console.log('Environment loaded.');
console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('FIREBASE')));

// Map DO_ prefix to standard if missing
if (!process.env.FIREBASE_PRIVATE_KEY && process.env.DO_FIREBASE_PRIVATE_KEY) {
    process.env.FIREBASE_PRIVATE_KEY = process.env.DO_FIREBASE_PRIVATE_KEY;
}
if (!process.env.FIREBASE_PROJECT_ID && process.env.DO_FIREBASE_PROJECT_ID) {
    process.env.FIREBASE_PROJECT_ID = process.env.DO_FIREBASE_PROJECT_ID;
}
if (!process.env.FIREBASE_CLIENT_EMAIL && process.env.DO_FIREBASE_CLIENT_EMAIL) {
    process.env.FIREBASE_CLIENT_EMAIL = process.env.DO_FIREBASE_CLIENT_EMAIL;
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.error('❌ FIREBASE_PRIVATE_KEY is missing. Check .env.local (looked for FIREBASE_PRIVATE_KEY and DO_FIREBASE_PRIVATE_KEY)');
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

const DUAL_ROLE_USER = {
    email: 'dualrole@example.com',
    password: 'Test@1234',
    displayName: 'Dual Role User',
    roles: ['Job Giver', 'Installer'],
    profileData: {
        userType: 'Job Giver', // Default primary type
        firstName: 'Dual',
        lastName: 'Role',
        phone: '9999999999',
        aadharNumber: '999999990099', // Dummy Aadhar
        isVerified: true,
        skills: ['Testing', 'Switching'],
        createdAt: new Date().toISOString(),
    }
};

async function seedDualRole() {
    console.log('🌱 Seeding dual role user for Project:', process.env.FIREBASE_PROJECT_ID);

    try {
        let uid;
        // 1. Check if user exists in Auth
        try {
            const userRecord = await auth.getUserByEmail(DUAL_ROLE_USER.email);
            uid = userRecord.uid;
            console.log(`✅ User ${DUAL_ROLE_USER.email} already exists in Auth.`);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                // Create user
                const newUser = await auth.createUser({
                    email: DUAL_ROLE_USER.email,
                    password: DUAL_ROLE_USER.password,
                    displayName: DUAL_ROLE_USER.displayName,
                    emailVerified: true,
                });
                uid = newUser.uid;
                console.log(`✨ Created Auth User: ${DUAL_ROLE_USER.email}`);
            } else {
                throw e;
            }
        }

        // 2. Update Firestore Profile
        const userRef = db.collection('users').doc(uid);
        await userRef.set({
            uid: uid,
            email: DUAL_ROLE_USER.email,
            displayName: DUAL_ROLE_USER.displayName,
            roles: DUAL_ROLE_USER.roles,
            ...DUAL_ROLE_USER.profileData
        }, { merge: true });

        console.log(`📝 Updated/Created Firestore Profile for ${DUAL_ROLE_USER.email} with roles: ${DUAL_ROLE_USER.roles.join(', ')}`);

    } catch (error) {
        console.error(`❌ Error seeding ${DUAL_ROLE_USER.email}:`, error);
        process.exit(1);
    }
    console.log('🏁 Seeding complete.');
}

seedDualRole().catch(console.error);
