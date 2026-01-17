
import {
    collection,
    addDoc,
    serverTimestamp,
    Firestore
} from "firebase/firestore";
import { Activity } from "./types";

/**
 * Logs a new activity to the 'activities' collection.
 * @param db Firestore instance (client or server)
 * @param activity Activity data (excluding id and timestamp)
 */
export async function logActivity(
    db: Firestore,
    activity: Omit<Activity, 'id' | 'timestamp' | 'read'>
) {
    try {
        const activitiesRef = collection(db, 'activities');
        await addDoc(activitiesRef, {
            ...activity,
            timestamp: serverTimestamp(),
            read: false
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
        // We don't want to block the main flow if activity logging fails, 
        // so we just log the error and proceed.
    }
}
