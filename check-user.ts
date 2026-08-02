import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "dodo-beta";
initializeApp({ projectId: "dodo-beta" });
getAuth().getUserByEmail("installer_pro_v3@team4job.com")
  .then(user => console.log("User exists:", user.uid))
  .catch(err => console.error("Error:", err.message));
