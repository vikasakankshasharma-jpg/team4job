
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * 🛠️ Scenario Runner for Local Testing
 * 
 * Usage:
 * tsx scripts/scenario-runner.ts --fresh
 * tsx scripts/scenario-runner.ts --job-ready
 * tsx scripts/scenario-runner.ts --bid-placed
 * tsx scripts/scenario-runner.ts --payment-ready
 */

// 1. Setup Emulators Mode
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "team4job-beta";
process.env.GCLOUD_PROJECT = projectId;

if (getApps().length === 0) {
    initializeApp({ projectId });
}

const auth = getAuth();
const db = getFirestore();

// --- Core Helper Functions ---
async function clearEmulatorData() {
    console.log("🧹 Clearing Firestore Collections...");
    const collections = ['jobs', 'users', 'notifications', 'transactions', 'activities', 'bids'];
    for (const col of collections) {
        const snapshot = await db.collection(col).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`   - Cleared ${col}`);
    }
}

async function createBaseUsers() {
    console.log("👤 Creating Base Test Users...");
    const users = [
        { uid: 'admin-uid', email: 'vikasakankshasharma@gmail.com', pass: 'Admin_Pass2026!', name: 'Vikram Singh', roles: ['Admin'] },
        { uid: 'giver-uid', email: 'rajesh.client@team4job.com', pass: 'TestUser_2026!', name: 'Rajesh Kumar', roles: ['Client'] },
        { uid: 'installer-uid', email: 'amit.pro@team4job.com', pass: 'TestUser_2026!', name: 'Amit Patel', roles: ['Professional'] },
        { uid: 'installer-2-uid', email: 'suresh.pro@team4job.com', pass: 'TestUser_2026!', name: 'Suresh Reddy', roles: ['Professional'] }
    ];

    for (const u of users) {
        try {
            await auth.createUser({
                uid: u.uid,
                email: u.email,
                password: u.pass,
                displayName: u.name,
                emailVerified: true
            });
        } catch (e: any) {
            // Already exists in Auth? No problem for local test.
        }

        const userData: any = {
            id: u.uid,
            email: u.email,
            displayName: u.name,
            name: u.name,
            roles: u.roles,
            status: 'active',
            createdAt: Timestamp.now(),
            isMobileVerified: true,
            isEmailVerified: true,
            isDummyData: true,
            professionalProfile: u.roles.includes('Professional') ? {
                verified: true,
                tier: 'Silver',
                skills: ['Security & Surveillance', 'CCTV Installation']
            } : undefined,
            payouts: u.roles.includes('Professional') ? {
                beneficiaryId: `BENE_${u.uid}`,
                accountHolderName: u.name
            } : undefined
        };

        // Remove undefined keys to satisfy Firestore validator
        Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);

        await db.collection("users").doc(u.uid).set(userData);
        console.log(`   - Created ${u.name}`);
    }
}

// --- Specific Scenario Logic ---

async function scenarioFresh() {
    await clearEmulatorData();
    await createBaseUsers();
    console.log("✅ Fresh Start scenario complete.");
}

async function scenarioJobReady() {
    console.log("🎯 Scenario: Job Ready for Bidding...");
    const jobId = "JOB-TEST-READY";
    await db.collection("jobs").doc(jobId).set({
        id: jobId,
        title: "Test CCTV Installation",
        description: "Standard CCTV setup for a small office. 4 cameras and 1 NVR.",
        status: "Open for Bidding",
        jobGiverId: "giver-uid",
        category: "CCTV Installation",
        location: "560001",
        priceEstimate: { min: 4000, max: 6000 },
        postedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        isDummyData: true,
        bids: [],
        bidderIds: []
    });
    console.log(`✅ Created Job: ${jobId}`);
}

async function scenarioBidPlaced() {
    await scenarioJobReady();
    console.log("🎯 Scenario: Active Bids Placed...");
    const jobId = "JOB-TEST-READY";
    
    const bids = [
        { id: 'bid-1', amount: 5500, installerId: 'installer-uid', installerName: 'Test Installer' },
        { id: 'bid-2', amount: 4800, installerId: 'installer-2-uid', installerName: 'Alt Installer' }
    ];

    for (const b of bids) {
        await db.collection("jobs").doc(jobId).collection("bids").doc(b.id).set({
            ...b,
            createdAt: Timestamp.now(),
            status: 'Pending'
        });
    }

    await db.collection("jobs").doc(jobId).update({
        bidCount: 2,
        bidderIds: ['installer-uid', 'installer-2-uid']
    });
    console.log(`✅ Placed 2 bids on Job: ${jobId}`);
}

async function scenarioPaymentReady() {
    await scenarioBidPlaced();
    console.log("🎯 Scenario: Awarded & Ready for Funding...");
    const jobId = "JOB-TEST-READY";
    
    await db.collection("jobs").doc(jobId).update({
        status: "Awarded",
        selectedBid: { id: 'bid-2', amount: 4800, installerId: 'installer-2-uid' },
        awardedAt: Timestamp.now()
    });
    console.log(`✅ Job ${jobId} awarded to Alt Installer.`);
}

async function scenarioAuditReady() {
    console.log("🕵️ Scenario: Preparing Universal Master Audit...");
    await scenarioFresh();
    // Additional cleanup or setup for specific audit accounts if needed
    console.log("✅ Audit Ready. Run 'npm run test:audit' next.");
}

// --- CLI Entry Point ---
const args = process.argv.slice(2);
async function run() {
    if (args.includes('--fresh')) await scenarioFresh();
    if (args.includes('--job-ready')) await scenarioJobReady();
    if (args.includes('--bid-placed')) await scenarioBidPlaced();
    if (args.includes('--payment-ready')) await scenarioPaymentReady();
    if (args.includes('--audit-ready')) await scenarioAuditReady();

    if (args.length === 0) {
        console.log("❌ No arguments provided. Use --fresh, --job-ready, --bid-placed, --payment-ready, or --audit-ready.");
    }
    process.exit(0);
}

run().catch(console.error);
