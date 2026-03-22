import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.DO_FIREBASE_PROJECT_ID;
const clientEmail = process.env.DO_FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase credentials in .env.local');
    process.exit(1);
}

delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.NEXT_PUBLIC_USE_EMULATOR;

if (getApps().length === 0) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

const auth = getAuth();
const db = getFirestore();

// ── Helpers ──
const daysAgo = (n: number) => Timestamp.fromDate(new Date(Date.now() - n * 86400000));
const daysFromNow = (n: number) => Timestamp.fromDate(new Date(Date.now() + n * 86400000));
const now = () => Timestamp.now();

async function getUid(email: string): Promise<string> {
    try {
        const u = await auth.getUserByEmail(email);
        return u.uid;
    } catch {
        console.warn(`⚠️  User not found: ${email} — skipping`);
        return '';
    }
}

function makeBid(id: string, jobId: string, proId: string, proName: string, proEmail: string, amount: number, status = 'pending') {
    return {
        id, jobId,
        professional: db.collection('users').doc(proId),
        professionalId: proId,
        amount, status,
        coverLetter: `I have extensive experience and can complete this efficiently. Quoting ₹${amount}.`,
        timestamp: now(), createdAt: now(),
    };
}

function makeTransaction(id: string, jobId: string, jobTitle: string, payerId: string, payeeId: string, amount: number, status: string, extras: any = {}) {
    const clientFee = Math.round(amount * 0.18);
    const commission = Math.round(amount * 0.1);
    return {
        id, jobId, jobTitle, payerId, payeeId, amount,
        travelTip: 0, commission, clientFee,
        totalPaidByClient: amount + clientFee,
        payoutToProfessional: amount - commission,
        status, transactionType: 'JOB',
        paymentGatewayOrderId: `SEED_ORD_${id}`,
        paymentGatewaySessionId: `SEED_SES_${id}`,
        createdAt: now(), ...extras,
    };
}

function makeDispute(id: string, jobId: string, jobTitle: string, requesterId: string, clientId: string, proId: string) {
    return {
        id, jobId, jobTitle, requesterId,
        category: 'Job Dispute' as const,
        title: `Dispute: ${jobTitle}`,
        status: 'Open' as const,
        reason: 'Work quality does not match the agreed specifications. Several sensors are not functioning properly.',
        parties: { clientId, professionalId: proId },
        messages: [{
            authorId: requesterId, authorRole: 'Client',
            content: 'The sensors installed in Zone B are not detecting motion. This was part of the agreed scope.',
            timestamp: now(),
        }],
        createdAt: now(),
    };
}

const CATEGORIES = [
    'Security & Surveillance', 'Electrical Systems', 'Plumbing',
    'Smart Home Automation', 'Fire Safety', 'Interior Design',
    'General Maintenance', 'Networking',
];

const ADDR = {
    blr1: { house: '12A, Sunrise Apartments', street: 'MG Road, Indiranagar', landmark: 'Near Metro Station', cityPincode: '560038', fullAddress: '12A, Sunrise Apartments, MG Road, Indiranagar, Bangalore 560038' },
    blr2: { house: 'Shop 5, Ground Floor', street: 'Commercial Street, Koramangala', landmark: 'Opposite Forum Mall', cityPincode: '560034', fullAddress: 'Shop 5, Commercial Street, Koramangala, Bangalore 560034' },
    blr3: { house: '45, Laxmi Colony', street: 'Whitefield Main Road', landmark: 'Near ITPL', cityPincode: '560066', fullAddress: '45, Laxmi Colony, Whitefield Main Road, Bangalore 560066' },
    blr4: { house: '3, Palm Residency', street: 'Sarjapur Road', landmark: 'Near Wipro Gate', cityPincode: '560035', fullAddress: '3, Palm Residency, Sarjapur Road, Bangalore 560035' },
    blr5: { house: '18, Rose Garden', street: 'Jayanagar 4th Block', landmark: 'Near Cool Joint', cityPincode: '560041', fullAddress: '18, Rose Garden, Jayanagar 4th Block, Bangalore 560041' },
};

// ── Main ──
async function seedJobs() {
    console.log('🌱 Starting 20-Job Seed...\n');

    // 1. Resolve UIDs
    const [rajesh, priya, anita, amit, suresh, neha, manoj] = await Promise.all([
        getUid('rajesh.client@team4job.com'),
        getUid('priya.client@team4job.com'),
        getUid('anita.dual@team4job.com'),
        getUid('amit.pro@team4job.com'),
        getUid('suresh.pro@team4job.com'),
        getUid('neha.pro@team4job.com'),
        getUid('manoj.suspended@team4job.com'),
    ]);

    // Verify essential users exist
    if (!rajesh || !priya || !amit || !suresh) {
        console.error('❌ Essential users missing. Run super_seed.ts first.');
        process.exit(1);
    }
    console.log('✅ Resolved user UIDs\n');

    // 2. Clean old seeded jobs
    const oldJobs = await db.collection('jobs').where('isDummyData', '==', true).get();
    if (!oldJobs.empty) {
        const batch = db.batch();
        oldJobs.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log(`🗑️  Deleted ${oldJobs.size} old seeded jobs`);
    }

    const oldTxns = await db.collection('transactions').where('transactionType', '==', 'JOB').get();
    // Only delete seed transactions (those starting with TXN-SEED)
    const seedTxns = oldTxns.docs.filter(d => d.id.startsWith('TXN-SEED'));
    if (seedTxns.length > 0) {
        const batch = db.batch();
        seedTxns.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log(`🗑️  Deleted ${seedTxns.length} old seed transactions`);
    }

    const oldDisputes = await db.collection('disputes').where('id', '>=', 'DISP-SEED').where('id', '<=', 'DISP-SEED\uf8ff').get();
    if (!oldDisputes.empty) {
        const batch = db.batch();
        oldDisputes.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log(`🗑️  Deleted ${oldDisputes.size} old seed disputes`);
    }

    console.log('\n📝 Creating 20 jobs...\n');

    // ── Helper to write a full job ──
    async function writeJob(jobData: any, bids: any[] = [], txn?: any, dispute?: any) {
        const jobRef = db.collection('jobs').doc(jobData.id);
        await jobRef.set(jobData);

        for (const bid of bids) {
            await jobRef.collection('bids').doc(bid.id).set(bid);
        }

        if (txn) {
            await db.collection('transactions').doc(txn.id).set(txn);
        }
        if (dispute) {
            await db.collection('disputes').doc(dispute.id).set(dispute);
        }

        console.log(`  ✅ Job ${jobData.id} → ${jobData.status} (${jobData.title})`);
    }

    function baseJob(id: string, title: string, desc: string, category: string, clientId: string, addr: any, status: string, extras: any = {}) {
        return {
            id, title, description: desc,
            jobCategory: category,
            skills: [category],
            clientId,
            client: db.collection('users').doc(clientId),
            location: addr.cityPincode,
            fullAddress: addr.fullAddress,
            address: addr,
            priceEstimate: { min: 5000, max: 15000 },
            travelTip: 0,
            isGstInvoiceRequired: false,
            status,
            postedAt: daysAgo(14),
            deadline: daysFromNow(7),
            jobStartDate: daysFromNow(2),
            createdAt: daysAgo(14),
            updatedAt: now(),
            bids: [],
            bidderIds: [],
            comments: [],
            isDummyData: true,
            statusHistory: [{ oldStatus: 'draft', newStatus: status, timestamp: now(), changedBy: 'system', reason: 'Seeded' }],
            ...extras,
        };
    }

    // ═══════════════════════════════════════════
    // JOBS 1-3: OPEN FOR BIDDING
    // ═══════════════════════════════════════════

    // Job 1: Open, 3 bids
    const b1a = makeBid('BID-1A', 'SEED-JOB-01', amit, 'Amit Patel', 'amit.pro@team4job.com', 9500, 'pending');
    const b1b = makeBid('BID-1B', 'SEED-JOB-01', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 11000, 'pending');
    const b1c = makeBid('BID-1C', 'SEED-JOB-01', neha, 'Neha Gupta', 'neha.pro@team4job.com', 8000, 'pending');
    await writeJob(
        baseJob('SEED-JOB-01', 'Install 4 CCTV Cameras for Retail Shop', 'Need professional installation of 4 outdoor cameras with DVR setup and remote access.', CATEGORIES[0], rajesh, ADDR.blr1, 'open', {
            priceEstimate: { min: 8000, max: 15000 }, bidderIds: [amit, suresh, neha], bids: [b1a, b1b, b1c],
        }),
        [b1a, b1b, b1c]
    );

    // Job 2: Open, 1 bid
    const b2 = makeBid('BID-2A', 'SEED-JOB-02', amit, 'Amit Patel', 'amit.pro@team4job.com', 6000, 'pending');
    await writeJob(
        baseJob('SEED-JOB-02', 'Smart Lock Installation for Main Door', 'Install a smart fingerprint + PIN lock on the main entrance door.', CATEGORIES[3], rajesh, ADDR.blr1, 'open', {
            priceEstimate: { min: 4000, max: 8000 }, bidderIds: [amit], bids: [b2],
        }),
        [b2]
    );

    // Job 3: Open, urgent, zero bids
    await writeJob(
        baseJob('SEED-JOB-03', 'Emergency Pipe Leak Fix - Kitchen', 'Urgent water leak under kitchen sink. Need immediate repair.', CATEGORIES[2], rajesh, ADDR.blr1, 'open', {
            isUrgent: true, priceEstimate: { min: 2000, max: 5000 }, postedAt: daysAgo(1),
        })
    );

    // ═══════════════════════════════════════════
    // JOB 4: BID ACCEPTED
    // ═══════════════════════════════════════════
    const b4 = makeBid('BID-4A', 'SEED-JOB-04', amit, 'Amit Patel', 'amit.pro@team4job.com', 25000, 'Accepted');
    await writeJob(
        baseJob('SEED-JOB-04', 'Electrical Rewiring for 2BHK Apartment', 'Complete rewiring of a 2BHK apartment including switchboard upgrades.', CATEGORIES[1], rajesh, ADDR.blr1, 'bid_accepted', {
            priceEstimate: { min: 20000, max: 35000 }, bidderIds: [amit], bids: [b4],
            awardedProfessionalId: amit, awardedProfessional: db.collection('users').doc(amit),
            acceptanceDeadline: daysFromNow(2), fundingDeadline: daysFromNow(3),
        }),
        [b4]
    );

    // ═══════════════════════════════════════════
    // JOB 5: FUNDED, READY TO START
    // ═══════════════════════════════════════════
    const b5 = makeBid('BID-5A', 'SEED-JOB-05', amit, 'Amit Patel', 'amit.pro@team4job.com', 18000, 'Accepted');
    const txn5 = makeTransaction('TXN-SEED-05', 'SEED-JOB-05', 'Fire Alarm System Setup for Office', rajesh, 'ESCROW_HOLD', 18000, 'funded', { fundedAt: daysAgo(1) });
    await writeJob(
        baseJob('SEED-JOB-05', 'Fire Alarm System Setup for Office', 'Install fire alarm system with 6 smoke detectors and central control panel.', CATEGORIES[4], rajesh, ADDR.blr1, 'funded', {
            priceEstimate: { min: 15000, max: 25000 }, bidderIds: [amit], bids: [b5],
            awardedProfessionalId: amit, awardedProfessional: db.collection('users').doc(amit),
            fundedAt: daysAgo(1), startOtp: '482916',
        }),
        [b5], txn5
    );

    // ═══════════════════════════════════════════
    // JOB 6: IN PROGRESS
    // ═══════════════════════════════════════════
    const b6 = makeBid('BID-6A', 'SEED-JOB-06', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 45000, 'Accepted');
    const txn6 = makeTransaction('TXN-SEED-06', 'SEED-JOB-06', 'Full Home Automation System', rajesh, 'ESCROW_HOLD', 45000, 'funded', { fundedAt: daysAgo(5) });
    await writeJob(
        baseJob('SEED-JOB-06', 'Full Home Automation System', 'Smart lighting, motorized curtains, and voice-controlled AC for 3BHK villa.', CATEGORIES[3], rajesh, ADDR.blr3, 'in_progress', {
            priceEstimate: { min: 40000, max: 60000 }, bidderIds: [suresh], bids: [b6],
            awardedProfessionalId: suresh, awardedProfessional: db.collection('users').doc(suresh),
            fundedAt: daysAgo(5), workStartedAt: daysAgo(3),
        }),
        [b6], txn6
    );

    // ═══════════════════════════════════════════
    // JOB 7: WORK SUBMITTED
    // ═══════════════════════════════════════════
    const b7 = makeBid('BID-7A', 'SEED-JOB-07', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 12000, 'Accepted');
    const txn7 = makeTransaction('TXN-SEED-07', 'SEED-JOB-07', 'DVR System Upgrade', rajesh, 'ESCROW_HOLD', 12000, 'funded', { fundedAt: daysAgo(10) });
    await writeJob(
        baseJob('SEED-JOB-07', 'DVR System Upgrade to 16-Channel', 'Upgrade existing 8-channel DVR to 16-channel with NVR and cloud backup.', CATEGORIES[0], rajesh, ADDR.blr1, 'work_submitted', {
            priceEstimate: { min: 10000, max: 15000 }, bidderIds: [suresh], bids: [b7],
            awardedProfessionalId: suresh, awardedProfessional: db.collection('users').doc(suresh),
            fundedAt: daysAgo(10), workStartedAt: daysAgo(7), workSubmittedAt: daysAgo(1),
            completionOtp: '739201',
        }),
        [b7], txn7
    );

    // ═══════════════════════════════════════════
    // JOBS 8-11: COMPLETED (various reviews)
    // ═══════════════════════════════════════════

    // Job 8: Completed, 5-star both sides
    const b8 = makeBid('BID-8A', 'SEED-JOB-08', anita, 'Anita Desai', 'anita.dual@team4job.com', 35000, 'Accepted');
    const txn8 = makeTransaction('TXN-SEED-08', 'SEED-JOB-08', 'Office CCTV 8-Camera Setup', priya, anita, 35000, 'released', { fundedAt: daysAgo(30), releasedAt: daysAgo(20) });
    await writeJob(
        baseJob('SEED-JOB-08', 'Office CCTV 8-Camera Setup with NVR', '8 HD cameras with night vision, NVR, and mobile app setup for a commercial office.', CATEGORIES[0], priya, ADDR.blr2, 'completed', {
            priceEstimate: { min: 30000, max: 45000 }, bidderIds: [anita], bids: [b8],
            awardedProfessionalId: anita, awardedProfessional: db.collection('users').doc(anita),
            fundedAt: daysAgo(30), workStartedAt: daysAgo(28), completionTimestamp: daysAgo(20),
            clientReview: { rating: 5, review: 'Outstanding work! Anita installed all 8 cameras perfectly. Excellent cable management and very professional.', createdAt: daysAgo(19), authorId: priya, authorName: 'Priya Sharma' },
            professionalReview: { rating: 5, review: 'Great client. Clear requirements, prompt payments, and respectful communication throughout.', createdAt: daysAgo(18), authorId: anita, authorName: 'Anita Desai' },
        }),
        [b8], txn8
    );

    // Job 9: Completed, 4-star
    const b9 = makeBid('BID-9A', 'SEED-JOB-09', anita, 'Anita Desai', 'anita.dual@team4job.com', 22000, 'Accepted');
    const txn9 = makeTransaction('TXN-SEED-09', 'SEED-JOB-09', 'Intercom System Installation', priya, anita, 22000, 'released', { fundedAt: daysAgo(45), releasedAt: daysAgo(38) });
    await writeJob(
        baseJob('SEED-JOB-09', 'Intercom System for 4-Floor Building', 'Video intercom installation connecting 4 floors with lobby access control.', CATEGORIES[0], priya, ADDR.blr2, 'completed', {
            priceEstimate: { min: 18000, max: 28000 }, bidderIds: [anita], bids: [b9],
            awardedProfessionalId: anita, awardedProfessional: db.collection('users').doc(anita),
            fundedAt: daysAgo(45), workStartedAt: daysAgo(43), completionTimestamp: daysAgo(38),
            clientReview: { rating: 4, review: 'Good installation overall. Minor delay on day 2 but end result is solid.', createdAt: daysAgo(37), authorId: priya, authorName: 'Priya Sharma' },
        }),
        [b9], txn9
    );

    // Job 10: Completed, 3-star
    const b10 = makeBid('BID-10A', 'SEED-JOB-10', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 15000, 'Accepted');
    const txn10 = makeTransaction('TXN-SEED-10', 'SEED-JOB-10', 'Server Room Cooling Install', priya, suresh, 15000, 'released', { fundedAt: daysAgo(60), releasedAt: daysAgo(52) });
    await writeJob(
        baseJob('SEED-JOB-10', 'Server Room Cooling System Install', 'Install precision cooling unit for a small server room (10 sqm).', CATEGORIES[1], priya, ADDR.blr2, 'completed', {
            priceEstimate: { min: 12000, max: 20000 }, bidderIds: [suresh], bids: [b10],
            awardedProfessionalId: suresh, awardedProfessional: db.collection('users').doc(suresh),
            fundedAt: daysAgo(60), workStartedAt: daysAgo(58), completionTimestamp: daysAgo(52),
            clientReview: { rating: 3, review: 'Work was acceptable but not up to Gold-tier standard. Needed follow-up adjustments.', createdAt: daysAgo(51), authorId: priya, authorName: 'Priya Sharma' },
        }),
        [b10], txn10
    );

    // Job 11: Completed, no review yet
    const b11 = makeBid('BID-11A', 'SEED-JOB-11', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 20000, 'Accepted');
    const txn11 = makeTransaction('TXN-SEED-11', 'SEED-JOB-11', 'Access Control System', priya, suresh, 20000, 'released', { fundedAt: daysAgo(10), releasedAt: daysAgo(3) });
    await writeJob(
        baseJob('SEED-JOB-11', 'Biometric Access Control System', 'Install fingerprint + card access control for office entry with 3 access points.', CATEGORIES[0], priya, ADDR.blr2, 'completed', {
            priceEstimate: { min: 18000, max: 25000 }, bidderIds: [suresh], bids: [b11],
            awardedProfessionalId: suresh, awardedProfessional: db.collection('users').doc(suresh),
            fundedAt: daysAgo(10), workStartedAt: daysAgo(8), completionTimestamp: daysAgo(3),
        }),
        [b11], txn11
    );

    // ═══════════════════════════════════════════
    // JOB 12: DISPUTED
    // ═══════════════════════════════════════════
    const b12 = makeBid('BID-12A', 'SEED-JOB-12', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 28000, 'Accepted');
    const txn12 = makeTransaction('TXN-SEED-12', 'SEED-JOB-12', 'Parking Lot Sensor Setup', priya, 'ESCROW_HOLD', 28000, 'disputed', { fundedAt: daysAgo(15) });
    const disp12 = makeDispute('DISP-SEED-12', 'SEED-JOB-12', 'Parking Lot Sensor Setup', priya, priya, suresh);
    await writeJob(
        baseJob('SEED-JOB-12', 'Parking Lot Sensor Setup (12 Zones)', 'Motion sensors for 12 parking zones with central monitoring dashboard.', CATEGORIES[0], priya, ADDR.blr2, 'disputed', {
            priceEstimate: { min: 25000, max: 35000 }, bidderIds: [suresh], bids: [b12],
            awardedProfessionalId: suresh, awardedProfessional: db.collection('users').doc(suresh),
            fundedAt: daysAgo(15), workStartedAt: daysAgo(12), workSubmittedAt: daysAgo(5),
            disputeId: 'DISP-SEED-12',
        }),
        [b12], txn12, disp12
    );

    // ═══════════════════════════════════════════
    // JOB 13: IN PROGRESS WITH MILESTONES
    // ═══════════════════════════════════════════
    const b13 = makeBid('BID-13A', 'SEED-JOB-13', amit, 'Amit Patel', 'amit.pro@team4job.com', 50000, 'Accepted');
    const txn13 = makeTransaction('TXN-SEED-13', 'SEED-JOB-13', 'Warehouse Security System', rajesh, 'ESCROW_HOLD', 50000, 'funded', { fundedAt: daysAgo(7) });
    await writeJob(
        baseJob('SEED-JOB-13', 'Warehouse Security System (Full)', 'Complete security system for 5000 sqft warehouse: cameras, alarms, access control.', CATEGORIES[0], rajesh, ADDR.blr4, 'in_progress', {
            priceEstimate: { min: 40000, max: 60000 }, bidderIds: [amit], bids: [b13],
            awardedProfessionalId: amit, awardedProfessional: db.collection('users').doc(amit),
            fundedAt: daysAgo(7), workStartedAt: daysAgo(5),
            milestones: [
                { id: 'MS-1', title: 'Camera Installation', description: 'Install 8 cameras', amount: 20000, status: 'released', createdAt: Date.now() - 7 * 86400000 },
                { id: 'MS-2', title: 'Alarm System', description: 'Install alarm sensors', amount: 15000, status: 'funded', createdAt: Date.now() - 5 * 86400000 },
                { id: 'MS-3', title: 'Access Control + Testing', description: 'Access control and final testing', amount: 15000, status: 'pending', createdAt: Date.now() - 5 * 86400000 },
            ],
        }),
        [b13], txn13
    );

    // ═══════════════════════════════════════════
    // JOBS 14-16: CANCELLED (various reasons)
    // ═══════════════════════════════════════════

    // Job 14: Cancelled by client before funding
    const b14a = makeBid('BID-14A', 'SEED-JOB-14', neha, 'Neha Gupta', 'neha.pro@team4job.com', 7000, 'pending');
    await writeJob(
        baseJob('SEED-JOB-14', 'Garden Sprinkler System Installation', 'Automated sprinkler system for 200 sqm garden with timer control.', CATEGORIES[6], rajesh, ADDR.blr4, 'cancelled', {
            priceEstimate: { min: 5000, max: 10000 }, bidderIds: [neha], bids: [b14a],
            cancellationReason: 'Project scope changed. Will re-post with updated requirements.',
            cancellationProposer: 'Client',
        }),
        [b14a]
    );

    // Job 15: Cancelled after funding, refunded
    const b15 = makeBid('BID-15A', 'SEED-JOB-15', neha, 'Neha Gupta', 'neha.pro@team4job.com', 18000, 'Accepted');
    const txn15 = makeTransaction('TXN-SEED-15', 'SEED-JOB-15', 'Interior Paint 3 Rooms', anita, neha, 18000, 'refunded', { fundedAt: daysAgo(20), refundedAt: daysAgo(15) });
    await writeJob(
        baseJob('SEED-JOB-15', 'Interior Paint for 3 Rooms', 'Full interior painting (Asian Paints Royale) for 3 bedrooms including ceiling.', CATEGORIES[5], anita, ADDR.blr5, 'cancelled', {
            priceEstimate: { min: 15000, max: 22000 }, bidderIds: [neha], bids: [b15],
            awardedProfessionalId: neha, awardedProfessional: db.collection('users').doc(neha),
            fundedAt: daysAgo(20),
            cancellationReason: 'Professional unable to start on agreed date. Mutually agreed cancellation.',
            cancellationProposer: 'Professional',
        }),
        [b15], txn15
    );

    // Job 16: Cancelled due to suspended pro
    const b16 = makeBid('BID-16A', 'SEED-JOB-16', manoj, 'Manoj Tiwari', 'manoj.suspended@team4job.com', 5000, 'Accepted');
    const txn16 = makeTransaction('TXN-SEED-16', 'SEED-JOB-16', 'Wiring Repair for Shop', priya, manoj, 5000, 'refunded', { fundedAt: daysAgo(25), refundedAt: daysAgo(22) });
    await writeJob(
        baseJob('SEED-JOB-16', 'Electrical Wiring Repair for Shop', 'Fix faulty wiring in retail shop causing intermittent power cuts.', CATEGORIES[1], priya, ADDR.blr2, 'cancelled', {
            priceEstimate: { min: 3000, max: 7000 }, bidderIds: [manoj], bids: [b16],
            awardedProfessionalId: manoj, awardedProfessional: db.collection('users').doc(manoj),
            fundedAt: daysAgo(25),
            cancellationReason: 'Professional account suspended. Job auto-cancelled and funds refunded.',
            cancellationProposer: 'Client',
        }),
        [b16], txn16
    );

    // ═══════════════════════════════════════════
    // JOB 17: UNBID (expired)
    // ═══════════════════════════════════════════
    await writeJob(
        baseJob('SEED-JOB-17', 'Aquarium Filtration System Setup', 'Custom filtration system for a 500L marine aquarium with UV sterilizer.', CATEGORIES[6], rajesh, ADDR.blr1, 'unbid', {
            priceEstimate: { min: 8000, max: 12000 }, postedAt: daysAgo(30), deadline: daysAgo(16),
        })
    );

    // ═══════════════════════════════════════════
    // JOB 18: IN PROGRESS (direct award)
    // ═══════════════════════════════════════════
    const b18 = makeBid('BID-18A', 'SEED-JOB-18', amit, 'Amit Patel', 'amit.pro@team4job.com', 8000, 'Accepted');
    const txn18 = makeTransaction('TXN-SEED-18', 'SEED-JOB-18', 'Repeat CCTV Maintenance', rajesh, 'ESCROW_HOLD', 8000, 'funded', { fundedAt: daysAgo(3) });
    await writeJob(
        baseJob('SEED-JOB-18', 'Annual CCTV Maintenance & Recalibration', 'Yearly maintenance for 4 existing cameras: cleaning, repositioning, firmware update.', CATEGORIES[0], rajesh, ADDR.blr1, 'in_progress', {
            priceEstimate: { min: 6000, max: 10000 }, bidderIds: [amit], bids: [b18],
            awardedProfessionalId: amit, awardedProfessional: db.collection('users').doc(amit),
            directAwardProfessionalId: amit,
            fundedAt: daysAgo(3), workStartedAt: daysAgo(1),
        }),
        [b18], txn18
    );

    // ═══════════════════════════════════════════
    // JOB 19: OPEN (GST required, high budget)
    // ═══════════════════════════════════════════
    const b19 = makeBid('BID-19A', 'SEED-JOB-19', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 85000, 'pending');
    await writeJob(
        baseJob('SEED-JOB-19', 'Commercial Fire Safety Audit & Install', 'Full fire safety audit, extinguisher placement, and signage for 3-floor commercial building.', CATEGORIES[4], priya, ADDR.blr2, 'open', {
            isGstInvoiceRequired: true,
            priceEstimate: { min: 70000, max: 120000 }, bidderIds: [suresh], bids: [b19],
        }),
        [b19]
    );

    // ═══════════════════════════════════════════
    // JOB 20: COMPLETED with additional tasks
    // ═══════════════════════════════════════════
    const b20 = makeBid('BID-20A', 'SEED-JOB-20', suresh, 'Suresh Reddy', 'suresh.pro@team4job.com', 32000, 'Accepted');
    const txn20 = makeTransaction('TXN-SEED-20', 'SEED-JOB-20', 'Smart Home Lighting Retrofit', priya, suresh, 32000, 'released', { fundedAt: daysAgo(25), releasedAt: daysAgo(15) });
    await writeJob(
        baseJob('SEED-JOB-20', 'Smart Home Lighting Retrofit', 'Replace all lights with smart LED bulbs and install Alexa-controlled dimmers in 4 rooms.', CATEGORIES[3], priya, ADDR.blr2, 'completed', {
            priceEstimate: { min: 25000, max: 40000 }, bidderIds: [suresh], bids: [b20],
            awardedProfessionalId: suresh, awardedProfessional: db.collection('users').doc(suresh),
            fundedAt: daysAgo(25), workStartedAt: daysAgo(23), completionTimestamp: daysAgo(15),
            additionalTasks: [
                { id: 'AT-1', description: 'Add motion sensor for hallway light', status: 'funded', quoteAmount: 3000, quoteDetails: 'Philips motion sensor with 5m range', createdBy: 'Professional', createdAt: daysAgo(20) },
                { id: 'AT-2', description: 'Install smart plug for AC unit', status: 'funded', quoteAmount: 1500, quoteDetails: 'WiFi smart plug 16A', createdBy: 'Client', createdAt: daysAgo(19) },
            ],
            clientReview: { rating: 5, review: 'Suresh went above and beyond. The additional tasks were quoted fairly and executed perfectly.', createdAt: daysAgo(14), authorId: priya, authorName: 'Priya Sharma' },
            professionalReview: { rating: 4, review: 'Good project. Client was cooperative and the scope was well-defined from the start.', createdAt: daysAgo(13), authorId: suresh, authorName: 'Suresh Reddy' },
        }),
        [b20], txn20
    );

    // ═══════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════
    console.log('\n🎉 All 20 jobs seeded successfully!\n');
    console.log('Summary:');
    console.log('  Open:           3 (jobs 1-3, 19)');
    console.log('  Bid Accepted:   1 (job 4)');
    console.log('  Funded:         1 (job 5)');
    console.log('  In Progress:    3 (jobs 6, 13, 18)');
    console.log('  Work Submitted: 1 (job 7)');
    console.log('  Completed:      5 (jobs 8-11, 20)');
    console.log('  Disputed:       1 (job 12)');
    console.log('  Cancelled:      3 (jobs 14-16)');
    console.log('  Unbid:          1 (job 17)');
    console.log('  GST Required:   1 (job 19)');
    console.log('  Direct Award:   1 (job 18)');
    console.log('  With Milestones:1 (job 13)');
    console.log('  With Add Tasks: 1 (job 20)');
}

seedJobs().then(() => process.exit(0)).catch(e => { console.error('SEED FAILED:', e); process.exit(1); });
