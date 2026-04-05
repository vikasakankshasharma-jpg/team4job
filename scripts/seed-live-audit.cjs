const admin = require('firebase-admin');

// Use Application Default Credentials (ADC) from gcloud auth
if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'team4job-live'
    });
}
const auth = admin.auth();
const db = admin.firestore();

const usersToCreate = [
    { email: 'giver_vip_v3@team4job.com', password: 'TestUser_2026!', displayName: 'Priya VIP Giver', role: 'Job Giver', roles: ['Job Giver'] },
    { email: 'giver_new_v3@team4job.com', password: 'TestUser_2026!', displayName: 'Suresh New Giver', role: 'Job Giver', roles: ['Job Giver'] },
    { email: 'installer_pro_v3@team4job.com', password: 'TestUser_2026!', displayName: 'Rajesh Pro Installer', role: 'Installer', roles: ['Installer'], kyc: true },
    { email: 'installer_new_v3@team4job.com', password: 'TestUser_2026!', displayName: 'Amit New Installer', role: 'Installer', roles: ['Installer'], kyc: false },
    { email: 'vikasakankshasharma_v3@gmail.com', password: 'Admin_Pass2026!', displayName: 'Vikas Admin', role: 'Admin', roles: ['Admin', 'Installer', 'Job Giver'] }
];

async function seedUsers() {
    console.log('Recreating all test users via Application Default Credentials...');
    
    for (const u of usersToCreate) {
        try {
            // Delete if exists so we can recreate securely with known password hash
            try {
                const existingUser = await auth.getUserByEmail(u.email);
                await auth.deleteUser(existingUser.uid);
                console.log(`Deleted existing user ${u.email}`);
            } catch (err) {
                if (err.code !== 'auth/user-not-found') throw err;
            }

            // Create fresh
            const createOptions = {
                email: u.email,
                password: u.password,
                displayName: u.displayName,
                emailVerified: true
            };
            if (u.role === 'Installer' && u.kyc) {
                createOptions.phoneNumber = '+919999999900';
            }

            const userRecord = await auth.createUser(createOptions);
            console.log(`Created new auth user ${u.email}`);
            
            // Set claims
            await auth.setCustomUserClaims(userRecord.uid, { roles: u.roles, role: u.role });
            
            // Add/Update to Firestore
            const userData = {
                id: userRecord.uid,
                email: u.email,
                name: u.displayName,
                roles: u.roles,
                status: 'active',
                isDummyData: true, 
                isPhoneVerified: true,
                isEmailVerified: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (u.role === 'Installer') {
               userData.professionalProfile = {
                  verified: !!u.kyc,
                  isVerified: !!u.kyc,
                  skills: u.kyc ? ['CCTV Installation', 'Networking', 'Wiring'] : [],
                  rating: u.kyc ? 4.8 : 0,
                  jobsCompleted: u.kyc ? 12 : 0
               };
            }
            if (u.role === 'Admin') {
                userData.roles = u.roles;
            }
            
            await db.collection('users').doc(userRecord.uid).set(userData);
            console.log(`✅ Set Firestore data for ${u.email}`);
            
        } catch (e) {
            console.error(`Failed to process user ${u.email}:`, e.message);
        }
    }
    console.log('✅ All users recreated successfully.');
}

seedUsers().catch(console.error);
