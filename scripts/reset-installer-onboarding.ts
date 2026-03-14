
import { config } from 'dotenv';
if (!process.env.CI) {
    config({ path: '.env.local' });
}

async function resetInstaller() {
    const { getAdminDb } = await import('../src/lib/firebase/server-init');
    const { getAuth } = await import('firebase-admin/auth');

    try {
        const db = getAdminDb();
        const auth = getAuth();

        const userRecord = await auth.getUserByEmail('installer_pro_v3@team4job.com');
        const userId = userRecord.uid;

        console.log(`Resetting onboarding for Installer: ${userId}`);

        await db.collection('users').doc(userId).update({
            "installerProfile.experience": "",
            "installerProfile.skills": [],
            "installerProfile.verificationStatus": "not_started",
            "installerProfile.documents": {},
            "installerProfile.submittedAt": null,
            "installerProfile.shopName": "",
            "address.cityPincode": "",
            "address.city": "",
            "name": "Pro Installer" // Reset name if needed
        });

        console.log('Successfully reset onboarding state.');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting installer:', error);
        process.exit(1);
    }
}

resetInstaller();
