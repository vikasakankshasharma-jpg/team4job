import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { sendPushNotification } from "./notifications";

const db = admin.firestore();

/**
 * Handles scheduled cleanup of jobs that are stuck in "Pending Funding".
 */
export const handleUnfundedJobs = functions.pubsub.schedule("every 6 hours").onRun(async () => {
  const now = admin.firestore.Timestamp.now();
  const fortyEightHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 48 * 60 * 60 * 1000);

  const snapshot = await db.collection("jobs")
    .where("status", "==", "Pending Funding")
    .where("fundingDeadline", "<=", fortyEightHoursAgo)
    .get();

  if (snapshot.empty) return null;

  const batch = db.batch();
  const notifications: Promise<void>[] = [];

  snapshot.docs.forEach((doc) => {
    const job = doc.data();
    batch.update(doc.ref, { status: "Cancelled" });

    notifications.push(sendPushNotification(job.client.id, "Job Cancelled", `Job "${job.title}" was cancelled due to no funding.`, `/dashboard/jobs/${doc.id}`));
    notifications.push(sendPushNotification(job.awardedProfessional.id, "Job Cancelled", `Job "${job.title}" was cancelled as the Client did not fund the escrow.`, `/dashboard/jobs/${doc.id}`));
  });

  await batch.commit();
  await Promise.allSettled(notifications);
  return null;
});

/**
 * Implements the "Job Rescue Plan" for jobs that have officially become "Unbid".
 */
export const handleUnbidJobs = functions.pubsub.schedule("every 1 hours").onRun(async () => {
  const snapshot = await db.collection("jobs")
    .where("status", "==", "Unbid")
    .get();

  if (snapshot.empty) return null;

  for (const doc of snapshot.docs) {
    const job = doc.data();
    await doc.ref.update({ status: "Needs Assistance" });
    sendPushNotification(job.client.id, "Job Needs Attention", `Your job "${job.title}" didn't receive bids. Review your options.`, `/dashboard/jobs/${doc.id}`).catch(() => { /* ignore */ });
  }
  return null;
});

/**
 * Handles scheduled cleanup of jobs where the award offer has expired.
 */
export const handleExpiredAwards = functions.pubsub.schedule("every 1 hours").onRun(async () => {
  const now = admin.firestore.Timestamp.now();

  const snapshot = await db.collection("jobs")
    .where("status", "==", "Awarded")
    .where("acceptanceDeadline", "<=", now)
    .get();

  if (snapshot.empty) return null;

  const batch = db.batch();
  const notifications: Promise<void>[] = [];

  snapshot.docs.forEach((doc) => {
    const job = doc.data();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profIds = (job.selectedProfessionals || []).map((s: any) => s.professionalId);

    profIds.forEach((id: string) => {
      notifications.push(sendPushNotification(id, "Offer Expired", `Offer for "${job.title}" has expired.`, `/dashboard/jobs/${doc.id}`));
    });

    batch.update(doc.ref, {
      status: "Bidding Closed",
      awardedProfessional: admin.firestore.FieldValue.delete(),
      acceptanceDeadline: admin.firestore.FieldValue.delete(),
      selectedProfessionals: [],
      disqualifiedProfessionalIds: admin.firestore.FieldValue.arrayUnion(...profIds),
    });

    notifications.push(sendPushNotification(job.client.id, "Offer Expired", `Your offer for "${job.title}" expired. You can award it to someone else.`, `/dashboard/jobs/${doc.id}`));
  });

  await batch.commit();
  await Promise.allSettled(notifications);
  return null;
});
