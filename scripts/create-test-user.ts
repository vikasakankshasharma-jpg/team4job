
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminAuth, getAdminDb, getAdminApp } from '../src/infrastructure/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

async function createDualRoleUser() {
    console.log('Validating admin app...');
    // Ensure the app initializes using existing logic
    try {
        getAdminApp();
    } catch (e) {
        console.error("Failed to init admin app. Make sure .env.local vars are loaded.", e);
        process.exit(1);
    }

    const auth = getAdminAuth();
    const db = getAdminDb();
    const email = 'dualrole@example.com';
    const password = 'Vikas@129229';

    console.log(`Checking user: ${email}`);

    try {
        let uid;
        try {
            const userRecord = await auth.getUserByEmail(email);
            console.log('User exists in Auth:', userRecord.uid);
            uid = userRecord.uid;
        } catch (e) {
            console.log('User does not exist in Auth, creating...');
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: 'Dual Role Tester',
                emailVerified: true
            });
            console.log('User created:', userRecord.uid);
            uid = userRecord.uid;
        }

        // Update Firestore
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();

        const userData = {
            email,
            fullName: 'Dual Role Tester',
            role: ['Job Giver', 'Installer'], // Array of roles
            activeRole: 'Job Giver',
            updatedAt: FieldValue.serverTimestamp(),
            emailVerified: true,
            profileComplete: true,
            isRestricted: false
        };

        if (!doc.exists) {
            console.log('Creating Firestore document...');
            await userRef.set({
                ...userData,
                createdAt: FieldValue.serverTimestamp(),
            });
        } else {
            console.log('Updating Firestore document...');
            await userRef.update(userData);
        }

        console.log('✅ Dual Role User setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating user:', error);
        process.exit(1);
    }
}

createDualRoleUser();
