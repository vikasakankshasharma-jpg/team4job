
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
}

// Force use of Emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const PROJECT_ID = 'team4job-live';

if (!getApps().length) {
    initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();
const auth = getAuth();

// DETERMINISTIC UIDs (Must match ci-seed.ts)
const CLIENT_UID = 'AUDIT_CLIENT_PRIYA_001';
const PRO_UID = 'AUDIT_PRO_RAJESH_001';

async function restoreState() {
    console.log(`🚀 Restore: Starting Deterministic Audit State (Project: ${PROJECT_ID})`);
    
    const statePath = path.resolve('tests/fixtures/audit-state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const jobId = state.jobId;
    
    if (!jobId) throw new Error('No Job ID found in audit-state.json');
    console.log(`[Restore] Syncing state for Job: ${jobId}`);

    const now = Timestamp.now();

    // 1. Force User Docs (Required for Joins in SSR)
    const clientDocRef = db.collection('users').doc(CLIENT_UID);
    await clientDocRef.set({
        id: CLIENT_UID,
        email: 'giver_vip_v3@team4job.com',
        name: 'Priya VIP Giver',
        roles: ['Client'],
        status: 'active',
        createdAt: now
    }, { merge: true });

    const proDocRef = db.collection('users').doc(PRO_UID);
    await proDocRef.set({
        id: PRO_UID,
        email: 'installer_pro_v3@team4job.com',
        name: 'Rajesh Pro Installer',
        roles: ['Professional'],
        status: 'active',
        professionalProfile: {
            title: 'Audit Specialist',
            skills: ['CCTV', 'Networking']
        },
        createdAt: now
    }, { merge: true });

    // 2. Create Job in root collection
    const jobRef = db.collection('jobs').doc(jobId);
    await jobRef.set({
        id: jobId,
        clientId: CLIENT_UID,
        client: clientDocRef, // Reference as expected by some components
        title: state.uniqueTitle,
        description: 'Audit Job: Testing final negotiation and awarding flow.',
        status: 'open',
        budget: { min: 1000, max: 5000 },
        pincode: '560038',
        address: 'Audit Site, Indiranagar',
        createdAt: now,
        updatedAt: now,
        category: 'cctv',
        bidderIds: [PRO_UID] // Critical for visibility checks
    }, { merge: true });

    // 3. Create Bid in Sub-collection (Aligned with bid.repository.ts)
    const bidId = `BID_PRO_${Date.now()}`;
    const bidRef = jobRef.collection('bids').doc(bidId);
    await bidRef.set({
        id: bidId,
        jobId: jobId,
        professionalId: PRO_UID,
        professional: {
            id: PRO_UID,
            name: 'Rajesh Pro Installer'
        },
        amount: 2500,
        timeline: '2 days',
        status: 'pending',
        timestamp: now, // Critical for orderBy('timestamp') in repo
        createdAt: now,
        updatedAt: now
    });

    // 4. Create Conversation in root collection
    const convRef = db.collection('conversations').doc(`CHAT_${jobId}`);
    await convRef.set({
        participants: [CLIENT_UID, PRO_UID],
        jobId: jobId,
        createdAt: now,
        updatedAt: now,
        lastMessage: {
            text: 'System: Final Deterministic State Synced.',
            senderId: 'SYSTEM',
            createdAt: now
        }
    });

    console.log(`✅ Success: State Restored. Job is OPEN with 1 BID and 1 CHAT.`);
    process.exit(0);
}

restoreState().catch(e => {
    console.error('❌ Failed to restore state:', e);
    process.exit(1);
});
