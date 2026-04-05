
import { config } from "dotenv";
import admin from "firebase-admin";

config({ path: ".env.production" });

async function getTestCredential() {
  const privateKey = process.env.DO_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  if (!privateKey) {
    console.error("Missing private key");
    process.exit(1);
  }

  const serviceAccount = {
    projectId: process.env.DO_FIREBASE_PROJECT_ID,
    clientEmail: process.env.DO_FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });
  }

  const db = admin.firestore();
  try {
    const docRef = db.collection("emailVerifyCodes").doc("audit_test_1@team4job.com");
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log("No such document in emailVerifyCodes!");
    } else {
      console.log("emailVerifyCodes data:", JSON.stringify(doc.data(), null, 2));
    }

    // Also check the user collection for this email
    const userRef = db.collection("users").where("email", "==", "audit_test_1@team4job.com");
    const userSnap = await userRef.get();
    if (userSnap.empty) {
      console.log("No user found with email audit_test_1@team4job.com");
    } else {
      userSnap.forEach(u => {
         console.log("User data:", JSON.stringify(u.data(), null, 2));
      });
    }

  } catch (error) {
    console.error("Error fetching documents:", error);
  }
}

getTestCredential().catch(console.error);
