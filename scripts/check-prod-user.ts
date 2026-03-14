
import { config } from "dotenv";
import admin from "firebase-admin";

config({ path: ".env.production" });

async function checkUser() {
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
  const email = "johndoe@example.com";
  
  console.log(`Checking user: ${email} in project: ${process.env.DO_FIREBASE_PROJECT_ID}`);
  
  const snapshot = await db.collection("users").where("email", "==", email).get();

  if (snapshot.empty) {
    console.log("No matching user found in production!");
    const allUsers = await db.collection("users").limit(10).get();
    console.log("Existing users (up to 10):");
    allUsers.forEach(doc => {
      console.log(`- ${doc.id}: ${doc.data().email} (${doc.data().roles})`);
    });
  } else {
    snapshot.forEach(doc => {
      console.log(`Found user: ${doc.id}`);
      console.log("Data:", JSON.stringify(doc.data(), null, 2));
    });
  }
}

checkUser().catch(console.error);
