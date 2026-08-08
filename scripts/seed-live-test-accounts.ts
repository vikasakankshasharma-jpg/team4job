import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

import * as fs from 'fs';

// Read the correct live service account directly
const serviceAccountPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

console.log('🌍 TARGETING LIVE ENVIRONMENT!');

// Initialize Firebase Admin using the direct service account
try {
    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }
    console.log('✅ Connected to Live Firebase Admin.');
} catch (e) {
    console.error('❌ Error initializing Firebase Admin:', e);
    process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

const TEST_USERS = [
    {
        email: 'beta_client@team4job.com',
        password: 'TestUser_2026!',
        displayName: 'Beta Client',
        role: 'Client',
        profileData: {
            userType: 'Job Giver',
            firstName: 'Beta',
            lastName: 'Client',
            phone: '8888888881',
            isMobileVerified: true,
            isEmailVerified: true,
            status: 'active',
            createdAt: new Date().toISOString(),
        }
    },
    {
        email: 'beta_pro@team4job.com',
        password: 'TestUser_2026!',
        displayName: 'Beta Pro',
        role: 'Professional',
        profileData: {
            userType: 'Installer',
            firstName: 'Beta',
            lastName: 'Pro',
            phone: '8888888882',
            aadharNumber: '888888880019',
            isMobileVerified: true,
            isEmailVerified: true,
            status: 'active',
            skills: ['CCTV', 'Networking'],
            createdAt: new Date().toISOString(),
            professionalProfile: {
                tier: 'Gold',
                verified: true,
                skills: ['CCTV', 'Networking']
            }
        }
    }
];

async function seedLiveAccounts() {
    console.log('🌱 Seeding LIVE test users for Project:', process.env.FIREBASE_PROJECT_ID);

    for (const user of TEST_USERS) {
        let uid;
        try {
            // 1. Ensure user in Auth
            try {
                const userRecord = await auth.getUserByEmail(user.email);
                uid = userRecord.uid;
                await auth.updateUser(uid, { password: user.password, displayName: user.displayName, emailVerified: true });
                console.log(`✅ User ${user.email} exists. Password/Profile updated.`);
            } catch (e: any) {
                if (e.code === 'auth/user-not-found') {
                    const newUser = await auth.createUser({
                        email: user.email,
                        password: user.password,
                        displayName: user.displayName,
                        emailVerified: true,
                    });
                    uid = newUser.uid;
                    console.log(`✨ Created Auth User: ${user.email} with UID: ${uid}`);
                } else {
                    throw e;
                }
            }

            // 2. Update Firestore Profile
            const userRef = db.collection('users').doc(uid);
            await userRef.set({
                uid: uid,
                email: user.email,
                displayName: user.displayName,
                roles: [user.role],
                activeRole: user.role,
                ...user.profileData
            }, { merge: true });
            console.log(`📝 Updated Firestore Profile for ${user.email}`);

            // 3. Add Wallet Funds via Transactions collection
            if (user.role === 'Professional') {
                const txnId = `fund_${uid}_${Date.now()}`;
                const txnRef = db.collection('transactions').doc(txnId);
                await txnRef.set({
                    id: txnId,
                    payeeId: uid,
                    amount: 5000,
                    status: 'completed',
                    type: 'funding',
                    description: 'Beta Tester Wallet Funding',
                    createdAt: FieldValue.serverTimestamp(),
                });
                console.log(`💰 Added 5000 units to wallet for ${user.email}`);
            }

        } catch (error) {
            console.error(`❌ Error seeding ${user.email}:`, error);
        }
    }
    console.log('🏁 Live environment seeding complete.');
    process.exit(0);
}

seedLiveAccounts().catch(console.error);
