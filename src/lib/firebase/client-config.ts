
import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./use-firebase-app";

// This file is now simplified to just export the db instance.
// The app initialization is handled by the use-firebase-app hook
// to ensure it only runs on the client with loaded env variables.

const app = getFirebaseApp();
const db = getFirestore(app);

export { app, db, getFirebaseApp };
