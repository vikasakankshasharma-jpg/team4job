/**
 * ----------------------------------------------------------------
 *  E2E Test Data Cleanup Script
 * ----------------------------------------------------------------
 * 
 * This script clears test data from Firebase that accumulates during
 * E2E test runs. It specifically targets collections that can grow
 * large and cause "INTERNAL ASSERTION FAILED" errors.
 * 
 * Usage: npm run db:cleanup
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.production', override: true });

function initializeFirebaseAdmin(): App {
    // 1. Try to use service-account.json first
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            const app = initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("✓ Firebase Admin SDK initialized using service-account.json");
            return app;
        }
    } catch (error: any) {
        console.error("Error reading service-account.json:", error.message);
    }

    // 2. Try environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            const app = initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("✓ Firebase Admin SDK initialized using environment variable");
            return app;
        } catch (error) {
            console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error);
            process.exit(1);
        }
    }

    // 3. Try separate env vars
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
            console.log("✓ Firebase Admin SDK initialized using separate environment variables");
            return app;
        } catch (error) {
            console.error("Error with separate env vars:", error);
        }
    }

    console.error("❌ Could not initialize Firebase Admin SDK");
    process.exit(1);
}

const firebaseApp = initializeFirebaseAdmin();
const adminDb = getFirestore(firebaseApp);

/**
 * Recursively clears a collection in batches
 */
async function clearCollection(collectionPath: string) {
    console.log(`\n📦 Clearing collection: ${collectionPath}...`);
    const collectionRef = adminDb.collection(collectionPath);
    const snapshot = await collectionRef.limit(500).get();

    if (snapshot.empty) {
        console.log(`  ✓ Collection ${collectionPath} is already empty`);
        return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size === 500) {
        console.log(`  → Cleared 500 documents, continuing...`);
        await clearCollection(collectionPath);
    } else {
        console.log(`  ✓ Cleared ${snapshot.size} documents from ${collectionPath}`);
    }
}

/**
 * Clears test data that matches specific patterns (e.g., JOB-20260116-)
 */
async function clearTestJobs() {
    console.log(`\n🧹 Clearing test-generated jobs (created today)...`);
    const jobsRef = adminDb.collection('jobs');

    // Get today's date string in the format used by test job IDs
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const testJobIdPrefix = `JOB-${dateStr}`;

    console.log(`  Looking for jobs with ID starting with: ${testJobIdPrefix}`);

    // Query for jobs created today
    const snapshot = await jobsRef.where('id', '>=', testJobIdPrefix).where('id', '<', `JOB-${dateStr}Z`).limit(100).get();

    if (snapshot.empty) {
        console.log(`  ✓ No test jobs found for today`);
        return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        console.log(`  - Deleting job: ${doc.id}`);
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`  ✓ Deleted ${snapshot.size} test jobs`);
}

/**
 * Main cleanup function
 */
async function cleanup() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   Firebase Test Data Cleanup');
    console.log('═══════════════════════════════════════════════════\n');

    try {
        // Clear test jobs first (more targeted)
        await clearTestJobs();

        // Clear collections that accumulate during testing
        const collectionsToClean = [
            'drafts',           // Job drafts created during testing
            'templates',        // Budget templates
            'notifications',    // Notifications accumulate quickly
            'budgetTemplates',  // Budget templates
        ];

        for (const collection of collectionsToClean) {
            await clearCollection(collection);
        }

        console.log('\n═══════════════════════════════════════════════════');
        console.log('✅ Cleanup completed successfully!');
        console.log('═══════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Cleanup failed:', error);
        process.exit(1);
    }
}

// Run cleanup
cleanup();
