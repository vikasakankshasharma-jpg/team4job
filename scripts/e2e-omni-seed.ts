
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Force use of Emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const PROJECT_ID = 'team4job-live';

if (!getApps().length) {
    initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();
const auth = getAuth();

// DETERMINISTIC UIDs (must match ci-seed.ts)
const CLIENT_UID = 'AUDIT_CLIENT_PRIYA_001';
const PRO_UID = 'AUDIT_PRO_RAJESH_001';

// --- Read target state from args: default is 'open'
// Usage: npx tsx scripts/e2e-omni-seed.ts [open|bid_accepted|funded]
const TARGET_STATE = (process.argv[2] || 'open') as 'open' | 'bid_accepted' | 'funded';

async function omniSeed() {
    console.log(`🚀 Omni-Seed: Target State = "${TARGET_STATE}" (Project: ${PROJECT_ID})`);

    const now = Timestamp.now();
    const epochMs = Date.now();
    const jobId = `JOB-AUDIT-${epochMs}`;
    const uniqueTitle = `Audit Job - ${epochMs}`;

    // 1. Ensure Auth Users exist (idempotent)
    for (const { uid, email } of [
        { uid: CLIENT_UID, email: 'giver_vip_v3@team4job.com' },
        { uid: PRO_UID,    email: 'installer_pro_v3@team4job.com' },
    ]) {
        try {
            await auth.createUser({ uid, email, password: 'TestUser_2026!', emailVerified: true });
            console.log(`✅ Created auth user: ${email}`);
        } catch (e: any) {
            if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
                console.log(`⚠️  Auth user already exists (OK): ${email}`);
            } else {
                console.warn(`⚠️  Unexpected auth error for ${email}: ${e.message}`);
            }
        }
    }

    // 2. Sync User Documents
    await db.collection('users').doc(CLIENT_UID).set({
        id: CLIENT_UID,
        email: 'giver_vip_v3@team4job.com',
        name: 'Priya VIP Giver',
        roles: ['Client', 'Dual'],
        status: 'active',
        createdAt: now,
    }, { merge: true });

    await db.collection('users').doc(PRO_UID).set({
        id: PRO_UID,
        email: 'installer_pro_v3@team4job.com',
        name: 'Rajesh Pro Installer',
        roles: ['Professional'],
        status: 'active',
        professionalProfile: { title: 'Audit Specialist', skills: ['CCTV'], verified: true },
        createdAt: now,
    }, { merge: true });

    // 3. Build the Job document according to target state
    const acceptanceDeadline = new Date(epochMs + 24 * 60 * 60 * 1000);
    const bidId = `BID_${jobId}`;

    const jobBase: Record<string, any> = {
        id: jobId,
        clientId: CLIENT_UID,
        title: uniqueTitle,
        description: 'Omni-Seed: Deterministic audit loop verification.',
        budget: { min: 3000, max: 7000 },
        pincode: '560038',
        address: { cityPincode: '560038', areaName: 'Indiranagar' },
        category: 'cctv',
        jobCategory: 'cctv',
        isUrgent: false,
        bidderIds: [PRO_UID],
        createdAt: now,
        postedAt: now,
        updatedAt: now,
        statusHistory: [],
        bids: [],
        comments: [],
    };

    const bidBase: Record<string, any> = {
        id: bidId,
        jobId,
        professionalId: PRO_UID,
        professional: { id: PRO_UID, name: 'Rajesh Pro Installer' },
        amount: 5500,
        timeline: '3 days',
        status: 'pending',
        timestamp: now,
        createdAt: now,
    };

    // Set job status & extra fields based on target state
    if (TARGET_STATE === 'open') {
        jobBase.status = 'open';
    } else if (TARGET_STATE === 'bid_accepted') {
        jobBase.status = 'bid_accepted';
        jobBase.awardedProfessionalId = PRO_UID;
        jobBase.acceptanceDeadline = Timestamp.fromDate(acceptanceDeadline);
        bidBase.status = 'selected';
    } else if (TARGET_STATE === 'funded') {
        jobBase.status = 'in_progress';
        jobBase.awardedProfessionalId = PRO_UID;
        jobBase.acceptanceDeadline = Timestamp.fromDate(acceptanceDeadline);
        jobBase.fundedAt = now;
        jobBase.startOtp = '123456'; 
        jobBase.workStartedAt = null;
        bidBase.status = 'selected';
    } else if (TARGET_STATE === 'work_started') {
        jobBase.status = 'in_progress';
        jobBase.awardedProfessionalId = PRO_UID;
        jobBase.acceptanceDeadline = Timestamp.fromDate(acceptanceDeadline);
        jobBase.fundedAt = now;
        jobBase.startOtp = '123456'; 
        jobBase.workStartedAt = now;
        bidBase.status = 'selected';
    } else if (TARGET_STATE === 'work_completed') {
        jobBase.status = 'pending_approval';
        jobBase.awardedProfessionalId = PRO_UID;
        jobBase.acceptanceDeadline = Timestamp.fromDate(acceptanceDeadline);
        jobBase.fundedAt = now;
        jobBase.startOtp = '123456'; 
        jobBase.workStartedAt = now;
        jobBase.completedAt = now;
        jobBase.attachments = [{
            fileName: 'work_proof.jpg',
            fileUrl: 'https://example.com/work_proof.jpg',
            uploadedAt: now,
            description: 'Work completed successfully',
            fileType: 'image/jpeg'
        }];
        bidBase.status = 'selected';
    } else if (TARGET_STATE === 'completed') {
        jobBase.status = 'completed';
        jobBase.awardedProfessionalId = PRO_UID;
        jobBase.acceptanceDeadline = Timestamp.fromDate(acceptanceDeadline);
        jobBase.fundedAt = now;
        jobBase.startOtp = '123456'; 
        jobBase.workStartedAt = now;
        jobBase.completedAt = now;
        jobBase.approvedAt = now;
        jobBase.attachments = [{
            fileName: 'work_proof.jpg',
            fileUrl: 'https://example.com/work_proof.jpg',
            uploadedAt: now,
            description: 'Work completed successfully',
            fileType: 'image/jpeg'
        }];
        bidBase.status = 'selected';
    } else if (TARGET_STATE === 'client_rated') {
        jobBase.status = 'completed';
        jobBase.awardedProfessionalId = PRO_UID;
        jobBase.acceptanceDeadline = Timestamp.fromDate(acceptanceDeadline);
        jobBase.fundedAt = now;
        jobBase.startOtp = '123456'; 
        jobBase.workStartedAt = now;
        jobBase.completedAt = now;
        jobBase.approvedAt = now;
        jobBase.isReviewedByGiver = true;
        jobBase.clientReview = {
            rating: 5,
            review: 'Excellent professional service. Highly recommended.',
            createdAt: now,
            authorId: CLIENT_UID,
            authorName: 'Priya Client'
        };
        bidBase.status = 'selected';
    } else if (TARGET_STATE === 'fully_rated') {
        jobBase.status = 'completed';
        jobBase.awardedProfessionalId = PRO_UID;
        jobBase.acceptanceDeadline = Timestamp.fromDate(acceptanceDeadline);
        jobBase.fundedAt = now;
        jobBase.startOtp = '123456'; 
        jobBase.workStartedAt = now;
        jobBase.completedAt = now;
        jobBase.approvedAt = now;
        jobBase.isReviewedByGiver = true;
        jobBase.clientReview = {
            rating: 5,
            review: 'Excellent professional service. Highly recommended.',
            createdAt: now,
            authorId: CLIENT_UID,
            authorName: 'Priya Client'
        };
        jobBase.isReviewedByProfessional = true;
        jobBase.professionalReview = {
            rating: 5,
            review: 'Great client experience. Clear requirements.',
            createdAt: now,
            authorId: PRO_UID,
            authorName: 'Rajesh Professional'
        };
        bidBase.status = 'selected';
    }

    // Write Job document
    const jobRef = db.collection('jobs').doc(jobId);
    await jobRef.set(jobBase);

    // Write Bid sub-collection
    await jobRef.collection('bids').doc(bidId).set(bidBase);

    // 4. Save state.json for test chunks
    const state = { jobId, uniqueTitle };
    const statePath = path.resolve('tests/fixtures/audit-state.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    console.log(`\n✅ OMNI-SEED COMPLETE!`);
    console.log(`   State   : ${TARGET_STATE}`);
    console.log(`   JobId   : ${jobId}`);
    console.log(`   Title   : ${uniqueTitle}`);
    console.log(`   State   : ${statePath}`);
}

omniSeed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
