
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Explicitly set Emulator Hosts for Admin SDK
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "team4job-live";
process.env.GCLOUD_PROJECT = projectId;

// Initialize Admin SDK (no params needed as env vars handle connection)
initializeApp({
    projectId: projectId
});

const auth = getAuth();
const db = getFirestore();

async function seed() {
    console.log('🌱 Seeding Emulator via Admin SDK...');

    // 1. Create Admin User
    try {
        try {
            const admin = await auth.createUser({
                uid: "admin-uid",
                email: "vikasakankshasharma_v3@gmail.com",
                password: "Admin_Pass2026!",
                displayName: "Test Admin",
                emailVerified: true
            });
            console.log("✅ Admin Auth User Created:", admin.uid);
        } catch (e: any) {
            if (e.code === 'auth/email-already-in-use' || e.code === 'auth/email-already-exists' || e.code === 'auth/uid-already-exists') {
                console.log("ℹ️ Admin Auth User already exists");
            } else {
                throw e;
            }
        }

        // 2. Set Admin Firestore Document
        await db.collection("users").doc("admin-uid").set({
            email: "vikasakankshasharma_v3@gmail.com",
            displayName: "Test Admin",
            roles: ["Admin"],
            createdAt: new Date().toISOString()
        });
        console.log("✅ Admin Firestore Document Created");


        // 3. Create Job Giver
        try {
            await auth.createUser({
                uid: "giver-uid",
                email: "giver_vip_v3@team4job.com",
                password: "TestUser_2026!",
                displayName: "Test Giver",
                emailVerified: true
            });
            console.log("✅ Giver Auth User Created");
        } catch (e: any) {
            if (e.code === 'auth/email-already-in-use' || e.code === 'auth/email-already-exists' || e.code === 'auth/uid-already-exists') {
                console.log("ℹ️ Giver Auth User already exists");
            } else {
                throw e;
            }
        }

        await db.collection("users").doc("giver-uid").set({
            email: "giver_vip_v3@team4job.com",
            displayName: "Test Giver",
            roles: ["Job Giver"],
            createdAt: new Date().toISOString()
        });
        console.log("✅ Giver Firestore Document Created");


        // 4. Create Installer
        try {
            await auth.createUser({
                uid: "installer-uid",
                email: "installer_pro_v3@team4job.com",
                password: "TestUser_2026!",
                displayName: "Test Installer",
                emailVerified: true
            });
            console.log("✅ Installer Auth User Created");
        } catch (e: any) {
            if (e.code === 'auth/email-already-in-use' || e.code === 'auth/email-already-exists' || e.code === 'auth/uid-already-exists') {
                console.log("ℹ️ Installer Auth User already exists");
            } else {
                throw e;
            }
        }

        await db.collection("users").doc("installer-uid").set({
            email: "installer_pro_v3@team4job.com",
            displayName: "Test Installer",
            roles: ["Installer"],
            createdAt: new Date().toISOString()
        });
        console.log("✅ Installer Firestore Document Created");

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }

    console.log("🎉 Seed complete. Emulators ready.");
    process.exit(0);
}

seed();
