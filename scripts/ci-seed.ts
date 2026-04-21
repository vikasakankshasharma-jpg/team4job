import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Force use of Emulators for local seeding
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

console.log('🔧 Configured for Local Emulators (Auth: 9099, Firestore: 8080, Storage: 9199)');

if (!getApps().length) {
    const projectId = 'team4job-live';
    initializeApp({ projectId });
}

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

const getTestPassword = () => 'TestUser_2026!';
const getAdminPassword = () => 'Admin_Pass2026!';

const TEST_USERS = [
    {
        name: 'Rajesh Kumar',
        email: 'rajesh.client@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000001',
        status: 'active',
        address: { house: '12A, Sunrise Apartments', street: 'MG Road, Indiranagar', landmark: 'Near Metro Station', cityPincode: '560038' },
        pincodes: { residential: '560038' },
    },
    {
        name: 'Priya Sharma',
        email: 'priya.client@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000002',
        status: 'active',
        address: { house: 'Shop 5, Ground Floor', street: 'Commercial Street, Koramangala', landmark: 'Opposite Forum Mall', cityPincode: '560034' },
        pincodes: { residential: '560034' },
    },
    {
        name: 'Amit Patel',
        email: 'amit.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000003',
        status: 'active',
        professionalProfile: { verified: true, tier: 'Silver', rating: 4.5, reviews: 8, points: 350, skills: ['cctv', 'wiring', 'it_support'], reputationHistory: [] },
        address: { house: '23, Vijay Nagar', street: 'BTM Layout', landmark: 'Near Silk Board Junction', cityPincode: '560029' },
        payouts: { beneficiaryId: 'BENE_AMIT_001', accountHolderName: 'Amit Patel', accountNumberMasked: '**** 1234', ifsc: 'SBIN0001234' },
        pincodes: { residential: '560029' }, aadharLast4: '4567', panNumber: 'ABCDE1234F', isPanVerified: true,
    },
    {
        name: 'Suresh Reddy',
        email: 'suresh.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000004',
        status: 'active',
        professionalProfile: { verified: true, tier: 'Gold', rating: 4.9, reviews: 45, points: 2200, skills: ['wiring', 'it_support', 'home_network', 'fire_security'], reputationHistory: [] },
        payouts: { beneficiaryId: 'BENE_SURESH_001', accountHolderName: 'Suresh Reddy', accountNumberMasked: '**** 7890', ifsc: 'HDFC0001234' },
        address: { house: '45, Laxmi Colony', street: 'Whitefield Main Road', landmark: 'Near ITPL', cityPincode: '560066' },
        pincodes: { residential: '560066' }, aadharLast4: '8901', panNumber: 'FGHIJ5678K', isPanVerified: true,
    },
    {
        name: 'Neha Gupta',
        email: 'neha.pro@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000005',
        status: 'active',
        professionalProfile: { verified: false, tier: 'Bronze', rating: 0, reviews: 0, points: 0, skills: ['sanitary', 'wiring'], reputationHistory: [] },
        address: { house: '7B, Tulsi Apartments', street: 'HSR Layout Sector 1', landmark: 'Near Agara Lake', cityPincode: '560102' },
        pincodes: { residential: '560102' },
    },
    {
        name: 'Vikram Singh',
        email: 'vikasakankshasharma_v3@gmail.com',
        password: getAdminPassword(),
        roles: ['Admin'],
        mobile: '9772699395',
        status: 'active',
        address: { house: 'Office 301, Tech Park', street: 'Outer Ring Road, Marathahalli', landmark: 'Near Bridge', cityPincode: '560037' },
        pincodes: { residential: '560037' },
    },
    {
        name: 'Anita Desai',
        email: 'anita.dual@team4job.com',
        password: getTestPassword(),
        roles: ['Client', 'Professional'],
        mobile: '9100000007',
        status: 'active',
        professionalProfile: { verified: true, tier: 'Silver', rating: 4.6, reviews: 15, points: 600, skills: ['painting', 'carpentry', 'wiring'], reputationHistory: [] },
        address: { house: '18, Rose Garden', street: 'Jayanagar 4th Block', landmark: 'Near Cool Joint', cityPincode: '560041' },
        pincodes: { residential: '560041' }, aadharLast4: '2345', panNumber: 'KLMNO9012P', isPanVerified: true,
    },
    {
        name: 'Manoj Tiwari',
        email: 'manoj.suspended@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000008',
        status: 'suspended',
        professionalProfile: { verified: true, tier: 'Bronze', rating: 2.1, reviews: 3, points: 50, skills: ['wiring', 'cctv'], reputationHistory: [] },
        address: { house: '99, Old Town', street: 'Malleshwaram', landmark: 'Near Bus Stand', cityPincode: '560003' },
        pincodes: { residential: '560003' },
    },
    {
        name: 'Kavita Joshi',
        email: 'kavita.support@team4job.com',
        password: getTestPassword(),
        roles: ['Support Team'],
        mobile: '9100000009',
        status: 'active',
        address: { house: 'Floor 2, Building B', street: 'Electronic City Phase 1', landmark: 'Near Infosys Gate', cityPincode: '560100' },
        pincodes: { residential: '560100' },
    },
    {
        name: 'Ravi Verma',
        email: 'ravi.newclient@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000010',
        status: 'active',
        address: { house: '3, Palm Residency', street: 'Sarjapur Road', landmark: 'Near Wipro Gate', cityPincode: '560035' },
        pincodes: { residential: '560035' },
    },
    {
        uid: 'AUDIT_PRO_RAJESH_001',
        name: 'Rajesh Pro Installer',
        email: 'installer_pro_v3@team4job.com',
        password: getTestPassword(),
        roles: ['Professional'],
        mobile: '9100000011',
        status: 'active',
        professionalProfile: { verified: true, tier: 'Silver', rating: 4.7, reviews: 12, points: 500, skills: ['cctv', 'wiring', 'home_network'], reputationHistory: [] },
        payouts: { beneficiaryId: 'BENE_INSTALLER_001', accountHolderName: 'Rajesh Pro Installer', accountNumberMasked: '**** 5678', ifsc: 'ICIC0001234' },
        address: { house: '10, Tech Enclave', street: 'Koramangala 5th Block', landmark: 'Near Forum Mall', cityPincode: '560095' },
        pincodes: { residential: '560095' }, aadharLast4: '1234', panNumber: 'PRSTU1234V', isPanVerified: true,
    },
    {
        uid: 'AUDIT_CLIENT_PRIYA_001',
        name: 'Priya VIP Giver',
        email: 'giver_vip_v3@team4job.com',
        password: getTestPassword(),
        roles: ['Client'],
        mobile: '9100000012',
        status: 'active',
        address: { house: '5, Green Valley', street: 'Indiranagar 100ft Road', landmark: 'Near ETA Mall', cityPincode: '560038' },
        pincodes: { residential: '560038' },
    },
];

async function seed() {
    console.log(`🚀 Starting E2E Seeding Pipeline (Total Users: ${TEST_USERS.length})...`);
    const batch = db.batch();
    
    // Clear existing users
    if (process.env.E2E_NO_CLEAR === 'true') {
        console.log('⏭️ Skipping database clearing (E2E_NO_CLEAR=true)');
    } else {
        console.log('🧹 Clearing emulator databases...');
        try {
            await fetch(`http://127.0.0.1:8080/emulator/v1/projects/team4job-live/databases/(default)/documents`, { method: 'DELETE' });
            await fetch(`http://127.0.0.1:9099/emulator/v1/projects/team4job-live/accounts`, { method: 'DELETE' });
        } catch (e) {
            console.warn('⚠️ Could not clear databases, proceeding anyway...', e);
        }
    }

    for (const userData of TEST_USERS) {
        let uid: string | undefined;
        try {
            const userRecord = await auth.createUser({
                ...(userData.uid && { uid: userData.uid }),
                email: userData.email,
                password: userData.password,
                displayName: userData.name,
                phoneNumber: '+91' + userData.mobile,
                emailVerified: true
            });
            uid = userRecord.uid;
            console.log(`✅ Created auth user: ${userData.email}`);
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                // Fetch existing user so we can still update their Firestore doc
                try {
                    const existing = await auth.getUserByEmail(userData.email);
                    uid = existing.uid;
                    console.log(`⚠️ Auth user already exists (using existing UID): ${userData.email}`);
                } catch (fetchErr) {
                    console.error(`❌ Could not fetch existing user ${userData.email}:`, fetchErr);
                }
            } else {
                console.error(`❌ Failed to create auth user ${userData.email}:`, error);
            }
        }

        if (!uid) continue;

        const now = Timestamp.now();
        
        // Generate split names
        const nameParts = userData.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        const userDoc = {
            id: uid,
            email: userData.email,
            name: userData.name,
            displayName: userData.name, // Keep for legacy if needed
            firstName: firstName,
            lastName: lastName,
            phone: userData.mobile,
            roles: userData.roles,
            status: userData.status || 'active',
            isEmailVerified: true,
            isPhoneVerified: true,
            isMobileVerified: true,  // Required by bid dialog: user.isMobileVerified check
            primaryRole: userData.roles[0],
            createdAt: now.toDate().toISOString(),
            updatedAt: now,
            profileCompleteness: 100,
            kycStatus: 'approved',
            ...(userData.address && { address: userData.address }),
            ...(userData.pincodes && { pincodes: userData.pincodes }),
            ...(userData.professionalProfile && { professionalProfile: userData.professionalProfile }),
            ...(userData.payouts && { payouts: userData.payouts }),
            ...(userData.aadharLast4 && { aadharLast4: userData.aadharLast4 }),
            ...(userData.panNumber && { panNumber: userData.panNumber }),
            ...(userData.isPanVerified && { isPanVerified: userData.isPanVerified })
        };

        const docRef = db.collection('users').doc(uid);
        batch.set(docRef, userDoc);
        console.log(`✅ Staged user doc: ${userData.email}`);
    }
    
    console.log('💾 Committing standard users batch...');
    await batch.commit();

    console.log('✅✅✅ E2E Seeding completed successfully!');
    process.exit(0);
}

seed().catch((e) => {
    console.error('🔥 CRITICAL ERROR IN SEEDING SCRIPT:', e);
    process.exit(1);
});
