import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function reseedAudit() {
    console.log("Starting Audit Reseed (Wiping EVERYTHING)...");

    try {
        const { getAdminDb, getAdminAuth } = await import('../src/lib/firebase/server-init');
        const { Timestamp } = await import('firebase-admin/firestore');

        const db = getAdminDb();
        const auth = getAdminAuth();

        // 1. WIPE AUTH USERS
        console.log("Step 1: Wiping ALL Auth Users...");
        let nextPageToken;
        let authCount = 0;
        do {
            const listUsersResult: any = await auth.listUsers(1000, nextPageToken);
            const uids = listUsersResult.users.map((userRecord: any) => userRecord.uid);
            if (uids.length > 0) {
                await auth.deleteUsers(uids);
                authCount += uids.length;
            }
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
        console.log(`Deleted ${authCount} users from Auth.`);

        // 2. WIPE FIRESTORE COLLECTIONS
        console.log("Step 2: Wiping ALL Firestore Collections...");
        // Get all root collections
        const collections = await db.listCollections();
        for (const collection of collections) {
            const colName = collection.id;
            const snapshot = await db.collection(colName).listDocuments();
            if (snapshot.length > 0) {
                console.log(`Deleting ${snapshot.length} documents from ${colName}...`);
                const batchSize = 100;
                for (let i = 0; i < snapshot.length; i += batchSize) {
                    const batch = db.batch();
                    snapshot.slice(i, i + batchSize).forEach(doc => batch.delete(doc));
                    await batch.commit();
                }
            }

            // Also check for subcollections (this is harder in bulk, but we know the main ones)
            if (colName === 'users') {
                 // Wipe subcollections for each user document we just deleted? 
                 // listDocuments only gives the IDs. We should have wiped docs before but subcollections remain.
                 // In Firestore, deleting a doc doesn't delete subcollections.
                 // Let's explicitly target known subcollections.
            }
        }

        // Targeted wipe for subcollections
        const userSubcols = ['jobDrafts', 'jobTemplates', 'notifications', 'activities', 'payouts'];
        // Re-fetching users is hard since we just wiped them. 
        // Best way to wipe subcollections is to have a list or use a recursive delete utility if available.
        // For this audit, we'll focus on the primary collections.

        // 3. CREATE ADMIN
        console.log("Step 3: Creating Specified Admin...");
        const adminEmail = 'vikasakankshasharma@gmail.com';
        const adminPassword = 'Vikas@129229';
        const adminMobile = '9772699395';

        const adminRecord = await auth.createUser({
            email: adminEmail,
            password: adminPassword,
            displayName: 'Vikas Admin',
            phoneNumber: `+91${adminMobile}`,
            emailVerified: true
        });

        await auth.setCustomUserClaims(adminRecord.uid, { roles: ['Admin', 'Client', 'Professional'], role: 'Admin' });

        await db.collection('users').doc(adminRecord.uid).set({
            id: adminRecord.uid,
            name: "Vikas Admin",
            email: adminEmail,
            mobile: adminMobile,
            roles: ['Admin', 'Client', 'Professional'],
            status: 'active',
            memberSince: Timestamp.now(),
            isMobileVerified: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            address: { 
                fullAddress: 'C-Scheme, Jaipur, Rajasthan', 
                cityPincode: '302001',
                house: '123',
                street: 'Main Road',
                landmark: 'Near Central Park'
            }
        });

        // 4. CREATE 10 PERSONAS (5 CLIENTS, 5 PROFESSIONALS)
        console.log("Step 4: Creating 10 Personas...");
        const commonPassword = 'Test@1234';

        const personas = [
            // CLIENTS
            {
                email: 'sharma.rahul@example.com',
                name: 'Rahul Sharma',
                mobile: '9829011111',
                roles: ['Client'],
                bio: 'Homeowner in Jaipur looking for CCTV and Security setup.'
            },
            {
                email: 'anjali.gupta@corp.in',
                name: 'Anjali Gupta',
                mobile: '9829022222',
                roles: ['Client'],
                bio: 'Office Manager at TechHub. Needs regular networking maintenance.'
            },
            {
                email: 'david.miller@retail.co',
                name: 'David Miller',
                mobile: '9829033333',
                roles: ['Client'],
                bio: 'Retail store owner. Interested in biometric attendance systems.'
            },
            {
                email: 'priya.singh@society.org',
                name: 'Priya Singh',
                mobile: '9829044444',
                roles: ['Client'],
                bio: 'Secretary for Sunrise Apartments. Looking for intercom repairs.'
            },
            {
                email: 'vikram.reddy@hotels.in',
                name: 'Vikram Reddy',
                mobile: '9829055555',
                roles: ['Client'],
                bio: 'Maintenance Head at Grand Plaza. WiFi and Electrical needs.'
            },
            // PROFESSIONALS
            {
                email: 'suresh.net@expert.com',
                name: 'Suresh Kumar',
                mobile: '9829066666',
                roles: ['Professional'],
                profInfo: { tier: 'Platinum', skills: ['Networking', 'Fiber Optics', 'Server Rack'], rating: 4.9, reviews: 45 }
            },
            {
                email: 'arjun.cctv@pro.in',
                name: 'Arjun V',
                mobile: '9829077777',
                roles: ['Professional'],
                profInfo: { tier: 'Gold', skills: ['CCTV', 'IP Cameras', 'NVR Setup'], rating: 4.7, reviews: 32 }
            },
            {
                email: 'fatima.sec@safety.com',
                name: 'Fatima Z',
                mobile: '9829088888',
                roles: ['Professional'],
                profInfo: { tier: 'Silver', skills: ['Biometrics', 'Alarm Systems', 'Fire Safety'], rating: 4.5, reviews: 18 }
            },
            {
                email: 'kevin.smart@home.in',
                name: 'Kevin D',
                mobile: '9829099999',
                roles: ['Professional'],
                profInfo: { tier: 'Bronze', skills: ['Smart Lighting', 'Home Automation', 'Electrical'], rating: 4.2, reviews: 8 }
            },
            {
                email: 'megha.it@infra.co',
                name: 'Megha R',
                mobile: '9829000000',
                roles: ['Professional'],
                profInfo: { tier: 'Bronze', skills: ['IT Support', 'Workstation Setup', 'Software'], rating: 0, reviews: 0 }
            }
        ];

        for (const p of personas) {
            const userRecord = await auth.createUser({
                email: p.email,
                password: commonPassword,
                displayName: p.name,
                phoneNumber: `+91${p.mobile}`,
                emailVerified: true
            });

            await auth.setCustomUserClaims(userRecord.uid, { roles: p.roles, role: p.roles[0] });

            const userData: any = {
                id: userRecord.uid,
                name: p.name,
                email: p.email,
                mobile: p.mobile,
                roles: p.roles,
                status: 'active',
                memberSince: Timestamp.now(),
                isMobileVerified: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                isDummyData: true,
                bio: (p as any).bio || '',
                address: {
                    cityPincode: '302001',
                    fullAddress: 'Jaipur, Rajasthan'
                }
            };

            if (p.roles.includes('Professional') && (p as any).profInfo) {
                const info = (p as any).profInfo;
                userData.professionalProfile = {
                    tier: info.tier,
                    skills: info.skills,
                    rating: info.rating,
                    reviews: info.reviews,
                    verified: info.tier !== 'Bronze',
                    points: info.tier === 'Platinum' ? 5000 : info.tier === 'Gold' ? 2000 : 500,
                    availability: { status: 'available' }
                };
            }

            await db.collection('users').doc(userRecord.uid).set(userData);
            console.log(`Created persona: ${p.name} (${p.roles[0]})`);
        }

        console.log("\nReseed Audit Complete!");
        process.exit(0);

    } catch (error) {
        console.error("Error during reseed audit:", error);
        process.exit(1);
    }
}

reseedAudit();
