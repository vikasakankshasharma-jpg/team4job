import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
const result = config({ path: resolve(process.cwd(), '.env.local') });
if (result.error) {
    console.error("Dotenv error:", result.error);
}

// We need to import these dynamically after dotenv config
async function reseedPlatform() {
    console.log("Starting Platform Reseed...");

    try {
        const { getAdminDb, getAdminAuth } = await import('../src/lib/firebase/server-init');
        const { Timestamp } = await import('firebase-admin/firestore');
        const admin = await import('firebase-admin');

        const db = getAdminDb();
        const auth = getAdminAuth();

        // --- 1. CLEANUP ---
        console.log("Step 1: Wiping existing data...");

        const collectionsToWipe = [
            'jobs',
            'transactions',
            'notifications',
            'activities',
            'public_profiles',
            'saved_searches',
            'reviews',
            'disputes'
        ];

        // Delete collections
        for (const colName of collectionsToWipe) {
            const snapshot = await db.collection(colName).listDocuments();
            if (snapshot.length > 0) {
                console.log(`Deleting ${snapshot.length} documents from ${colName}...`);
                const batchSize = 100;
                for (let i = 0; i < snapshot.length; i += batchSize) {
                    const batch = db.batch();
                    snapshot.slice(i, i + batchSize).forEach(doc => batch.delete(doc));
                    await batch.commit();
                }
            } else {
                console.log(`Collection ${colName} is already empty.`);
            }
        }

        // Wipe Users (Firestore only, Auth is harder to bulk wipe properly without hitting limits, 
        // but let's try to wipe non-admin users from Firestore at least to start fresh)
        const usersSnapshot = await db.collection('users').get();
        if (!usersSnapshot.empty) {
            console.log(`Deleting ${usersSnapshot.size} users from Firestore...`);
            const batch = db.batch();
            usersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        console.log("Data wipe complete.");


        // --- 2. ADMIN CREATION ---
        console.log("Step 2: Creating Admin User...");
        const adminEmail = 'vikasakankshasharma@gmail.com';
        const adminPassword = 'Vks2bhdj@9229'; // Use process.env in real prod, but hardcoded as per prompt

        let adminUid;
        try {
            const userRecord = await auth.getUserByEmail(adminEmail);
            adminUid = userRecord.uid;
            await auth.updateUser(adminUid, {
                password: adminPassword,
                displayName: "Vikas Admin",
                emailVerified: true
            });
            console.log(`Admin user updated: ${adminUid}`);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                const userRecord = await auth.createUser({
                    email: adminEmail,
                    password: adminPassword,
                    displayName: 'Vikas Admin',
                    emailVerified: true
                });
                adminUid = userRecord.uid;
                console.log(`Created Admin user: ${adminUid}`);
            } else {
                throw e;
            }
        }

        // Create Admin Firestore Profile
        await db.collection('users').doc(adminUid!).set({
            id: adminUid,
            name: "Vikas Admin",
            email: adminEmail,
            roles: ['Admin', 'Job Giver', 'Installer'], // Give all roles for easy testing
            status: 'active',
            memberSince: Timestamp.now(),
            isMobileVerified: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            isDummyData: false // Admin is "real"
        });

        // --- 2b. SEED SPECIFIC PERSONAS ---
        console.log("Step 2b: Creating Specific Dummy Personas...");
        const commonPassword = 'Test@1234';

        const personas = [
            {
                email: 'installer_pro@team4job.com',
                name: 'Rajesh Pro Installer',
                roles: ['Installer'],
                profile: {
                    tier: 'Platinum',
                    rating: 4.9,
                    reviews: 128,
                    verified: true,
                    skills: ['CCTV', 'Biometric', 'Networking', 'Smart Home'],
                    bio: "Expert installer with 10 years of experience. Platinum tier verified professional."
                },
                payouts: {
                    beneficiaryId: 'TEST_BENE_INIT',
                    accountHolderName: 'Rajesh Pro',
                    accountNumberMasked: '**** 1234',
                    ifsc: 'TEST0001234'
                }
            },
            {
                email: 'installer_new@team4job.com',
                name: 'Amit New Installer',
                roles: ['Installer'],
                profile: {
                    tier: 'Bronze',
                    rating: 0,
                    reviews: 0,
                    verified: false,
                    skills: ['CCTV'],
                    bio: "New to the platform, eager to work."
                }
            },
            {
                email: 'giver_vip@team4job.com',
                name: 'Priya VIP Giver',
                roles: ['Job Giver'],
                // VIP status is usually implied by history/spend, but we can tag if needed
                isDummyData: true
            },
            {
                email: 'giver_new@team4job.com',
                name: 'Suresh New Giver',
                roles: ['Job Giver'],
                isDummyData: true
            }
        ];

        for (const p of personas) {
            let uid;
            try {
                const userRecord = await auth.getUserByEmail(p.email);
                uid = userRecord.uid;
                await auth.updateUser(uid, {
                    password: commonPassword,
                    displayName: p.name,
                    emailVerified: true
                });
                console.log(`Updated persona: ${p.email}`);
            } catch (e: any) {
                if (e.code === 'auth/user-not-found') {
                    const userRecord = await auth.createUser({
                        email: p.email,
                        password: commonPassword,
                        displayName: p.name,
                        emailVerified: true
                    });
                    uid = userRecord.uid;
                    console.log(`Created persona: ${p.email}`);
                } else {
                    throw e;
                }
            }

            // Create Firestore Profile
            const userData: any = {
                id: uid,
                name: p.name + " (Demo)",
                email: p.email,
                roles: p.roles,
                status: 'active',
                memberSince: Timestamp.now(),
                isMobileVerified: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                isDummyData: true,
                address: {
                    cityPincode: "560001",
                    fullAddress: "Demo Address, Bangalore"
                }
            };

            if ((p as any).payouts) {
                userData.payouts = (p as any).payouts;
            }

            if (p.roles.includes('Installer')) {
                userData.installerProfile = {
                    tier: (p.profile as any).tier,
                    rating: (p.profile as any).rating,
                    reviews: (p.profile as any).reviews,
                    verified: (p.profile as any).verified,
                    skills: (p.profile as any).skills,
                    bio: (p.profile as any).bio,
                    points: (p.profile as any).tier === 'Platinum' ? 5000 : 0,
                    availability: { status: 'available' }
                };
            }

            await db.collection('users').doc(uid!).set(userData, { merge: true });
        }


        // --- 3. SEED USERS FOR JOBS ---
        console.log("Step 3: Creating Dummy Users for Jobs...");
        const dummyUserIds: string[] = [];

        // Create 5 Dummy Job Givers
        for (let i = 1; i <= 5; i++) {
            const uid = `dummy-giver-${i}`;
            dummyUserIds.push(uid);
            await db.collection('users').doc(uid).set({
                id: uid,
                name: `Dummy Giver ${i}`,
                email: `giver${i}@example.com`,
                roles: ['Job Giver'],
                status: 'active',
                memberSince: Timestamp.now(),
                isMobileVerified: true,
                isDummyData: true,
                address: {
                    cityPincode: "560001",
                    fullAddress: `Dummy Address ${i}, Bangalore`
                }
            });
        }


        // --- 4. SEED JOBS ---
        console.log("Step 4: Generating 100 Jobs...");

        const jobStatuses = ['Open for Bidding', 'In Progress', 'Completed', 'Cancelled', 'Awarded'];
        const categories = ['CCTV Installation', 'Biometric Setup', 'Video Door Phone', 'Networking', 'Maintenance'];
        const locations = ['560001', '560002', '110001', '400001']; // Bangalore, Delhi, Mumbai

        let jobBatch = db.batch();
        const TOTAL_JOBS = 100;

        for (let i = 0; i < TOTAL_JOBS; i++) {
            const jobId = `JOB-DUMMY-${i + 1}`;
            const jobGiverId = dummyUserIds[i % dummyUserIds.length];
            const status = jobStatuses[i % jobStatuses.length];
            const category = categories[i % categories.length];
            const location = locations[i % locations.length];

            const jobRef = db.collection('jobs').doc(jobId);

            jobBatch.set(jobRef, {
                id: jobId,
                title: `${category} at ${location} - ${i + 1}`,
                description: `This is a dummy job description for job ${i + 1}. It is used for testing layout and performance.`,
                status: status as any,
                jobGiverId: jobGiverId,
                jobGiver: db.collection('users').doc(jobGiverId), // Store ref
                category: category,
                jobCategory: category, // Using both for safety if schema changed
                location: location,
                fullAddress: `Test Address Line, ${location}`,
                address: { cityPincode: location },
                priceEstimate: { min: 1000 + (i * 10), max: 5000 + (i * 50) },
                postedAt: Timestamp.fromMillis(Date.now() - (i * 86400000)), // Spread over past days
                deadline: Timestamp.fromMillis(Date.now() + ((100 - i) * 86400000)), // Future deadlines
                createdAt: Timestamp.now(),
                // Optional extras for variety
                travelTip: i % 3 === 0 ? 100 : 0,
                isUrgent: i % 10 === 0,
                isDummyData: true
            });

            // Batch limit is 500, we are safe with 100, but good practice to commit chunks if larger
        }

        await jobBatch.commit();
        console.log(`Successfully seeded ${TOTAL_JOBS} jobs.`);

        console.log("Reseed Complete!");
        process.exit(0);

    } catch (error) {
        console.error("Error reseeding platform:", error);
        process.exit(1);
    }
}

reseedPlatform();
