
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local', override: true });

function initializeFirebaseAdmin() {
    try {
        // Fallback to manual cert if env vars fail, but try to use what we used for restore-admin first
        // or just use credentials directly if needed.
        // Assuming env vars are set now or we can reuse the logic.
        const serviceAccountPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return initializeApp({ credential: cert(serviceAccount) });
        }

        if (process.env.DO_FIREBASE_PRIVATE_KEY) {
            return initializeApp({
                credential: cert({
                    projectId: process.env.DO_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.DO_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
        }
    } catch (e) {
        console.error("Init Error:", e);
    }
    console.error("❌ Failed to initialize Firebase Admin.");
    process.exit(1);
}

const app = initializeFirebaseAdmin();
const db = getFirestore(app);

async function patchBankDetails() {
    console.log("Patching Installers with Dummy Bank Details...");
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('roles', 'array-contains', 'Installer').get();

    if (snapshot.empty) {
        console.log("No installers found to patch.");
        return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const user = doc.data();
        // Skip if already has details
        if (user.payouts?.beneficiaryId) return;

        const dummyBankDetails = {
            beneficiaryId: `BENE_TEST_${user.id.slice(0, 5)}_${Date.now()}`,
            accountHolderName: user.name || "Test Installer",
            accountNumberMasked: "**** **** 1234",
            ifsc: "TEST0000000", // Cashfree Sandbox IFSC
            bankAccount: "9999999999", // Valid dummy account
            address1: "Test Address, Sandbox City"
        };

        batch.update(doc.ref, { payouts: dummyBankDetails });
        count++;
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Successfully patched ${count} installers with dummy bank details.`);
    } else {
        console.log("All installers already have bank details.");
    }
}

patchBankDetails().then(() => process.exit(0)).catch(console.error);
