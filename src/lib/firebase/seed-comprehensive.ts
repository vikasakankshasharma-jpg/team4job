
/**
 * ----------------------------------------------------------------
 *  COMPREHENSIVE SEEDING SCRIPT - TEAM4JOB
 * ----------------------------------------------------------------
 *  
 *  This script executes a NUCLEAR reset of the database and populates
 *  it with a rich, realistic dataset for sales demos and QA.
 *  
 *  Capabilities:
 *  1. Deletes ALL users (Auth + Firestore) and Collections.
 *  2. Creates 10 Job Givers & 10 Installers (Rajasthan Cities).
 *  3. Generates 100 Jobs covering the full lifecycle (Open -> Completed/Disputed).
 *  4. Outputs a 'scenario_guide.md' for reference.
 * 
 *  Usage:
 *  npx tsx src/lib/firebase/seed-comprehensive.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { config } from 'dotenv';

// --- Configuration ---
config({ path: '.env.production', override: true });

// --- Firebase Initialization ---
function initializeFirebaseAdmin(): App {
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return initializeApp({ credential: cert(serviceAccount) });
        }

        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
        }

        if (process.env.DO_FIREBASE_CLIENT_EMAIL && process.env.DO_FIREBASE_PRIVATE_KEY) {
            const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
            return initializeApp({
                credential: cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
                    privateKey
                })
            });
        }
    } catch (e) {
        console.error("Init Error:", e);
    }
    console.error("❌ Failed to initialize Firebase Admin. Check keys.");
    process.exit(1);
}

const app = initializeFirebaseAdmin();
const db = getFirestore(app);
const auth = getAuth(app);

// --- Constants & Helpers ---

const RAJASTHAN_CITIES = [
    { name: 'Jaipur', district: 'Jaipur', pincode: '302001', lat: 26.9124, lng: 75.7873 },
    { name: 'Jodhpur', district: 'Jodhpur', pincode: '342001', lat: 26.2389, lng: 73.0243 },
    { name: 'Udaipur', district: 'Udaipur', pincode: '313001', lat: 24.5854, lng: 73.7125 },
    { name: 'Kota', district: 'Kota', pincode: '324001', lat: 25.2138, lng: 75.8648 },
    { name: 'Ajmer', district: 'Ajmer', pincode: '305001', lat: 26.4499, lng: 74.6399 },
    { name: 'Bikaner', district: 'Bikaner', pincode: '334001', lat: 28.0229, lng: 73.3119 },
    { name: 'Alwar', district: 'Alwar', pincode: '301001', lat: 27.5530, lng: 76.6346 },
    { name: 'Bhilwara', district: 'Bhilwara', pincode: '311001', lat: 25.3407, lng: 74.6313 },
];

const JOB_TITLES = [
    "Install 4 IP Cameras for Home Security",
    "Warehouse CCTV Setup - 16 Channel NVR",
    "Replace Old Analog Cameras with HD",
    "Office Surveillance System - 8 Dome Cameras",
    "PTZ Camera Installation at Main Gate",
    "Shop Security Upgrade - Hikvision Setup",
    "Farmhouse Perlmanent Security Cabling",
    "Apartment Complex Main Entrance Coverage",
    "Biometric Access Control & CCTV Integration",
    "Solar Powered CCTV for Remote Site"
];

const SKILLS = ['ip camera', 'nvr setup', 'cabling', 'troubleshooting', 'ptz', 'vms', 'fiber optics', 'access control', 'analog', 'smart home'];

// --- User Generation Logic ---

const users: any[] = [];
const userIdMap: Record<string, string> = {}; // email -> uid

async function createUsers() {
    console.log("Creating 20 Users (10 Givers, 10 Installers)...");

    // 10 Job Givers
    for (let i = 1; i <= 10; i++) {
        const city = RAJASTHAN_CITIES[(i - 1) % RAJASTHAN_CITIES.length];
        users.push({
            role: 'Job Giver',
            name: `JobGiver ${city.name} ${i}`,
            email: `jobgiver${i}@team4job.com`,
            mobile: `90000000${String(i).padStart(2, '0')}`,
            city: city
        });
    }

    // 10 Installers
    for (let i = 1; i <= 10; i++) {
        const city = RAJASTHAN_CITIES[(i - 1) % RAJASTHAN_CITIES.length];
        const tier = i <= 4 ? 'Bronze' : i <= 7 ? 'Silver' : i <= 9 ? 'Gold' : 'Platinum';
        users.push({
            role: 'Installer',
            name: `Installer ${city.name} ${i}`,
            email: `installer${i}@team4job.com`,
            mobile: `91111111${String(i).padStart(2, '0')}`,
            city: city,
            installerProfile: {
                tier,
                rating: 3.5 + (Math.random() * 1.5), // 3.5 to 5.0
                reviews: Math.floor(Math.random() * 50),
                skills: SKILLS.slice(0, Math.floor(Math.random() * 5) + 3),
                verified: i <= 8 // 80% verified
            }
        });
    }

    for (const u of users) {
        try {
            // Auth
            let uid = '';
            try {
                const existing = await auth.getUserByEmail(u.email);
                uid = existing.uid;
                await auth.updateUser(uid, { password: 'password123', displayName: u.name });
            } catch (e) {
                const created = await auth.createUser({
                    email: u.email,
                    password: 'password123',
                    displayName: u.name,
                    emailVerified: true
                });
                uid = created.uid;
            }
            userIdMap[u.email] = uid;

            // Firestore
            const userRef = db.collection('users').doc(uid);
            await userRef.set({
                id: uid,
                name: u.name,
                email: u.email,
                mobile: u.mobile,
                roles: [u.role],
                status: 'active',
                address: {
                    cityPincode: `${u.city.pincode}, ${u.city.name}`,
                    fullAddress: `Sector ${Math.floor(Math.random() * 100)}, ${u.city.name}, Rajasthan`
                },
                pincodes: { residential: u.city.pincode },
                district: u.city.district,
                memberSince: Timestamp.now(),
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
                installerProfile: u.installerProfile || null,
                isMobileVerified: true
            });

            // Public Profile
            await db.collection('public_profiles').doc(uid).set({
                id: uid,
                name: u.name,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
                roles: [u.role],
                status: 'active',
                installerProfile: u.installerProfile || null,
                address: { cityPincode: u.city.pincode },
                district: u.city.district
            });

        } catch (e) {
            console.error(`Failed to create user ${u.email}`, e);
        }
    }
    console.log("✓ Users created.");
}

// --- Job Generation Logic ---

const scenarioGuide: string[] = [];

async function createJobs() {
    console.log("Generating 100 Jobs with Scenarios...");
    const jobsRef = db.collection('jobs');
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Helper to get random item
    const rnd = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const getJobGiver = () => userIdMap[rnd(users.filter(u => u.role === 'Job Giver')).email];
    const getInstaller = () => userIdMap[rnd(users.filter(u => u.role === 'Installer')).email];

    // SCENARIO DEFINITIONS
    const scenarios = [
        { count: 15, type: 'Open - No Bids', status: 'Open for Bidding', notes: 'Ghost Town: Remote area job.' },
        { count: 15, type: 'Open - Bidding War', status: 'Open for Bidding', notes: 'Hot Property: 5+ bids.' },
        { count: 10, type: 'Awarded - Pending', status: 'Awarded', notes: 'Waiting for installer acceptance.' },
        { count: 10, type: 'In Progress - Funded', status: 'In Progress', notes: 'Funded and started.' },
        { count: 10, type: 'In Progress - Late', status: 'In Progress', notes: 'Past deadline, potential issue.' },
        { count: 20, type: 'Completed - Happy', status: 'Completed', notes: '5-star rating, smooth.' },
        { count: 10, type: 'Cancelled', status: 'Cancelled', notes: 'Cancelled by user.' },
        { count: 10, type: 'Disputed', status: 'Disputed', notes: 'Active dispute.' },
    ]; // Total 100

    let jobCounter = 1;

    for (const sc of scenarios) {
        for (let i = 0; i < sc.count; i++) {
            const jid = `JOB-${20260000 + jobCounter}`;
            const jobTitle = rnd(JOB_TITLES);
            const city = rnd(RAJASTHAN_CITIES);
            const jgUid = getJobGiver();

            // Base Job Data
            const jobData: any = {
                id: jid,
                title: `${jobTitle} (${sc.type})`,
                description: `Demo Scenario #${jobCounter}: ${sc.notes}. Located in ${city.name}. Req: ${rnd(SKILLS)}`,
                jobGiver: db.doc(`users/${jgUid}`),
                jobGiverId: jgUid,
                location: city.pincode,
                fullAddress: `Test Address, ${city.name}, Rajasthan`,
                address: { cityPincode: city.pincode },
                budget: { min: 5000, max: 15000 },
                status: sc.status,
                deadline: Timestamp.fromMillis(now + 7 * day),
                postedAt: Timestamp.fromMillis(now - 5 * day),
                isDummyData: true, // DEMO FLAG
                bids: [],
                bidderIds: []
            };

            // Scenario Specific Modifications
            if (sc.type.includes('No Bids')) {
                // Keep empty
            }
            else if (sc.type.includes('Bidding War')) {
                // Add 5-8 bids
                const bidCount = 5 + Math.floor(Math.random() * 4);
                for (let b = 0; b < bidCount; b++) {
                    const instId = getInstaller();
                    if (!jobData.bidderIds.includes(instId)) {
                        jobData.bidderIds.push(instId);
                        jobData.bids.push({
                            installer: db.doc(`users/${instId}`),
                            installerId: instId,
                            amount: 5000 + Math.floor(Math.random() * 5000),
                            timestamp: Timestamp.fromMillis(now - 2 * day),
                            coverLetter: "I am interested in this job."
                        });
                    }
                }
            }
            else if (sc.type.includes('Awarded')) {
                const instId = getInstaller();
                jobData.bidderIds = [instId];
                jobData.bids = [{ installer: db.doc(`users/${instId}`), installerId: instId, amount: 8000, timestamp: Timestamp.fromMillis(now - 3 * day) }];
                jobData.awardedInstaller = db.doc(`users/${instId}`);
                jobData.awardedInstallerId = instId;
                jobData.acceptanceDeadline = Timestamp.fromMillis(now + 24 * 60 * 60 * 1000);
            }
            else if (sc.status === 'In Progress') {
                const instId = getInstaller();
                jobData.bidderIds = [instId];
                jobData.bids = [{ installer: db.doc(`users/${instId}`), installerId: instId, amount: 8000 }];
                jobData.awardedInstaller = db.doc(`users/${instId}`);
                jobData.awardedInstallerId = instId;
                jobData.jobStartDate = Timestamp.fromMillis(now - 2 * day);
                jobData.workStartedAt = Timestamp.fromMillis(now - 1 * day);

                // Create Transaction for Funded status
                await db.collection('transactions').add({
                    jobId: jid,
                    status: 'Funded',
                    amount: 8000,
                    payerId: jgUid,
                    payeeId: instId,
                    type: 'JOB',
                    createdAt: Timestamp.fromMillis(now - 2 * day)
                });
            }
            else if (sc.status === 'Completed') {
                const instId = getInstaller();
                jobData.bidderIds = [instId];
                jobData.bids = [{ installer: db.doc(`users/${instId}`), installerId: instId, amount: 8000 }];
                jobData.awardedInstaller = db.doc(`users/${instId}`);
                jobData.awardedInstallerId = instId;
                jobData.completionTimestamp = Timestamp.fromMillis(now - 1 * day);
                jobData.rating = 5;
                jobData.review = "Excellent work!";
            }
            else if (sc.status === 'Disputed') {
                const instId = getInstaller();
                jobData.bidderIds = [instId];
                jobData.awardedInstaller = db.doc(`users/${instId}`);
                jobData.awardedInstallerId = instId;

                // Create Dispute
                const dispId = `DISP-${jid}`;
                jobData.disputeId = dispId;
                await db.collection('disputes').doc(dispId).set({
                    id: dispId,
                    jobId: jid,
                    jobTitle: jobData.title,
                    status: 'Open',
                    reason: 'Damage to property during installation.',
                    requesterId: jgUid,
                    createdAt: Timestamp.now(),
                    messages: []
                });
            }

            await jobsRef.doc(jid).set(jobData);

            // Add to guide
            scenarioGuide.push(`| ${jobCounter} | ${sc.type} | ${jid} | ${jobData.title} |`);

            jobCounter++;
        }
    }
    console.log("✓ Jobs created.");
}

async function nuclearCleanup() {
    console.log("☢️ STARTING NUCLEAR CLEANUP...");

    // Auth
    const listUsers = await auth.listUsers(1000);
    if (listUsers.users.length > 0) {
        await auth.deleteUsers(listUsers.users.map(u => u.uid));
        console.log(`- Deleted ${listUsers.users.length} Auth Users`);
    }

    // Collections
    const collections = ['users', 'public_profiles', 'jobs', 'disputes', 'transactions', 'notifications', 'reviews', 'messages', 'blacklist', 'audit_logs'];
    for (const c of collections) {
        const ref = db.collection(c);
        const sn = await ref.limit(500).get();
        if (!sn.empty) {
            const batch = db.batch();
            sn.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            console.log(`- Cleared ${c}`);
        }
    }
}

async function main() {
    await nuclearCleanup();
    await createUsers();
    await createJobs();

    // Write Scenario Guide
    const guideContent = `# Scenario Guide - Demo Data
    
| Case # | Scenario Type | Job ID | Title |
| :--- | :--- | :--- | :--- |
${scenarioGuide.join('\n')}
    `;

    fs.writeFileSync('scenario_guide.md', guideContent);
    console.log("📝 'scenario_guide.md' generated.");
    console.log("✨ Seeding Complete!");
}

main().catch(console.error);
