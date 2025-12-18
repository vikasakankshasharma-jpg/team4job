
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Scheduled function to monitor system health and log critical alerts.
 * Runs every 24 hours.
 * 
 * Checks for:
 * 1. Hostage Funds: Jobs in 'Pending Confirmation' > 72h
 * 2. Stale Disputes: Disputes open > 7 days
 * 3. Stuck Payments: Jobs in 'Pending Funding' > 7 days
 * 
 * Logs with severity 'ERROR' if thresholds are exceeded, which can trigger GCP alerts.
 */
export const monitorSystemHealth = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
    console.log("Running System Health Monitor...");
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const alerts: string[] = [];

    // 1. Check for Hostage Funds (Pending Confirmation > 72 hours)
    // 3 days + buffer
    const hostageThreshold = admin.firestore.Timestamp.fromMillis(now.toMillis() - (72 * 60 * 60 * 1000));

    const hostageQuery = await db.collection("jobs")
        .where("status", "==", "Pending Confirmation")
        .where("completionTimestamp", "<", hostageThreshold)
        .get();

    if (!hostageQuery.empty) {
        const msg = `ALERT: ${hostageQuery.size} jobs are in 'Pending Confirmation' for more than 72 hours. Potential hostage fund situation. IDs: ${hostageQuery.docs.map(d => d.id).join(", ")}`;
        console.error(msg);
        alerts.push(msg);
    }

    // 2. Check for Stale Disputes (Open > 7 days)
    const disputeThreshold = admin.firestore.Timestamp.fromMillis(now.toMillis() - (7 * 24 * 60 * 60 * 1000));

    const staleDisputesQuery = await db.collection("disputes")
        .where("status", "==", "Open")
        .where("createdAt", "<", disputeThreshold)
        .get();

    if (!staleDisputesQuery.empty) {
        const msg = `ALERT: ${staleDisputesQuery.size} disputes are open for more than 7 days. Escalation required. IDs: ${staleDisputesQuery.docs.map(d => d.id).join(", ")}`;
        console.error(msg);
        alerts.push(msg);
    }

    // 3. Check for Stuck Pending Funding ( > 7 days)
    // We auto-cancel at 48h usually, but if something failed, this catches it
    const fundingThreshold = admin.firestore.Timestamp.fromMillis(now.toMillis() - (7 * 24 * 60 * 60 * 1000));

    const stuckFundingQuery = await db.collection("jobs")
        .where("status", "==", "Pending Funding")
        .where("fundingDeadline", "<", fundingThreshold)
        .get();

    if (!stuckFundingQuery.empty) {
        const msg = `WARNING: ${stuckFundingQuery.size} jobs are stuck in 'Pending Funding' for > 7 days. Auto-cancellation might have failed. IDs: ${stuckFundingQuery.docs.map(d => d.id).join(", ")}`;
        console.warn(msg); // Warn, not error, as this is less critical than locked funds
        alerts.push(msg);
    }

    if (alerts.length === 0) {
        console.log("System Health Check Passed: No critical issues found.");
    } else {
        console.log(`System Health Check Completed with ${alerts.length} alerts.`);
    }

    return null;
});
