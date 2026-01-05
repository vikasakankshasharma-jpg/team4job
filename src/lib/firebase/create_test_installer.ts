
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { config } from 'dotenv';
import { PlaceHolderImages } from '../placeholder-images';
import type { User } from '../types';

config({ path: '.env.local', override: true });

function initializeFirebaseAdmin(): App {
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
            console.log("Firebase Admin SDK initialized.");
            return app;
        } catch (error) {
            console.error("Error initializing:", error);
            process.exit(1);
        }
    }
    console.error("Missing env vars.");
    process.exit(1);
}

const firebaseApp = initializeFirebaseAdmin();

const adminDb = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);

async function createInstaller() {
    const email = 'installer_final@test.com';
    const password = 'password123';
    const name = 'Installer Finale';

    let uid = '';

    // 1. Create Auth User
    try {
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
            emailVerified: true,
        });
        uid = userRecord.uid;
        console.log(`Created Auth User: ${uid}`);
    } catch (e: any) {
        if (e.code === 'auth/email-already-exists') {
            const user = await adminAuth.getUserByEmail(email);
            uid = user.uid;
            console.log(`User already exists: ${uid}`);
            // Reset password ensuring we can login
            await adminAuth.updateUser(uid, { password });
        } else {
            console.error("Error creating auth user:", e);
            return;
        }
    }

    // 2. Create Firestore Doc
    const newUser: Omit<User, 'id'> = {
        name: name,
        email: email,
        mobile: '9876543210',
        roles: ['Installer'],
        memberSince: new Date(),
        status: 'active',
        avatarUrl: PlaceHolderImages[0].imageUrl,
        realAvatarUrl: PlaceHolderImages[0].imageUrl,
        pincodes: { residential: '110001' },
        address: {
            house: '123',
            street: 'Main Street',
            cityPincode: '110001, Connaught Place S.O',
            fullAddress: '123, Main Street, Connaught Place, New Delhi, 110001'
        },
        subscription: {
            planId: 'trial',
            planName: 'Free Trial',
            expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) as any,
        },
        aadharLast4: '0019',
        panNumber: 'ABCDE1234F',
        isPanVerified: true,
        installerProfile: {
            tier: 'Bronze',
            points: 0,
            skills: ['cctv', 'ip camera'],
            rating: 0,
            reviews: 0,
            verified: true,
            reputationHistory: []
        }
    };

    await adminDb.collection('users').doc(uid).set({ ...newUser, id: uid });
    console.log("Firestore document created/updated.");
}

createInstaller().then(() => {
    console.log("Done.");
    process.exit(0);
});
