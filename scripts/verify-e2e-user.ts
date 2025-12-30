
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDEYoBGZnewG0uorkXvCUOSHbtVDu9VPGc",
    authDomain: "studio-1890574003-16f26.firebaseapp.com",
    projectId: "studio-1890574003-16f26",
    storageBucket: "studio-1890574003-16f26.firebasestorage.app",
    messagingSenderId: "849721048101",
    appId: "1:849721048101:web:1ac8f3551a09921cd7d3cc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CREDENTIALS = {
    email: 'jobgiver@example.com',
    password: 'Vikas@129229'
};

async function verifyUser() {
    console.log(`[Verify] Attempting login for ${CREDENTIALS.email}...`);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, CREDENTIALS.email, CREDENTIALS.password);
        const user = userCredential.user;
        console.log(`[Verify] Login Successful. UID: ${user.uid}`);

        // Check Firestore Doc
        console.log(`[Verify] Checking Firestore Doc users/${user.uid}...`);
        const userRef = doc(db, 'users', user.uid);
        try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                console.log(`[Verify] User Document EXISTS. ID: ${userSnap.id}`);
                console.log(`[Verify] Data Status:`, userSnap.data().status);
                console.log(`[Verify] Full Data:`, JSON.stringify(userSnap.data(), null, 2));
            } else {
                console.error(`[Verify] User Document DOES NOT EXIST. This causes 'Permission Denied' or 'Loading' hang in App.`);

                // Attempt to delete Auth User to allow re-seeding
                console.log(`[Verify] Attempting to delete Auth User to allow fresh signup...`);
                await user.delete();
                console.log(`[Verify] Auth User DELETED. Next E2E run should trigger SignUp flow (if implemented) or we need to seed.`);
            }
        } catch (fsErr: any) {
            console.error(`[Verify] Firestore Read Failed:`, fsErr.message);
            // If Permission Denied, it usually means the doc doesn't exist AND we can't read 'null' because of rules?
            // Or rule says: allow read if uid == userId.
            // If it fails validation, it might be due to mismatched ID.
        }

    } catch (authErr: any) {
        console.error(`[Verify] Login Failed:`, authErr.message);
    }
}

verifyUser();
