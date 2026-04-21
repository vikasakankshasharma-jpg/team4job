import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const PROJECT_ID = 'team4job-live';
if (!getApps().length) {
    initializeApp({ projectId: PROJECT_ID });
}
const auth = getAuth();

async function check() {
    try {
        const u1 = await auth.getUserByEmail('giver_vip_v3@team4job.com');
        console.log(` giver_vip_v3: ${u1.uid}`);
        const u2 = await auth.getUserByEmail('installer_pro_v3@team4job.com');
        console.log(` installer_pro_v3: ${u2.uid}`);
    } catch (e) {
        console.error(e);
    }
}
check();
