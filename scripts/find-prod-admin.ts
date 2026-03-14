
import { config } from "dotenv";
import admin from "firebase-admin";

config({ path: ".env.production" });

async function findAdmin() {
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
  console.log(`Searching for Admin in project: ${process.env.DO_FIREBASE_PROJECT_ID}`);
  
  const snapshot = await db.collection("users").get();
  let foundAdmin = false;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.roles && (data.roles.includes("Admin") || (Array.isArray(data.roles) && data.roles.includes("Admin")))) {
      console.log(`Found Admin: ${data.email} (ID: ${doc.id})`);
      foundAdmin = true;
    }
  });

  if (!foundAdmin) {
    console.log("No Admin found in the entire users collection!");
  }
}

findAdmin().catch(console.error);
