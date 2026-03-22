import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { sendPushNotification } from "./notifications";

const db = admin.firestore();

/**
 * Triggered when a new bid is created on a job.
 */
export const onBidCreated = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) return;

    const oldBidsCount = beforeData.bids?.length || 0;
    const newBidsCount = afterData.bids?.length || 0;

    if (newBidsCount > oldBidsCount) {
      const newBid = afterData.bids[newBidsCount - 1];
      const clientId = afterData.client.id;

      if (newBid.professional && typeof newBid.professional.get === "function") {
        try {
          const profDoc = await newBid.professional.get();
          const profName = profDoc.data()?.name || "A Professional";

          await sendPushNotification(
            clientId,
            "New Bid on Your Job!",
            `${profName} placed a bid of ₹${newBid.amount} on your job: "${afterData.title}"`,
            `/dashboard/jobs/${context.params.jobId}`
          );
        } catch (e) {
          functions.logger.error("Error in onBidCreated:", e);
        }
      }
    }
  });

/**
 * Triggered when a new private message is added to a job.
 */
export const onPrivateMessageCreated = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) return;

    const oldMessagesCount = beforeData.privateMessages?.length || 0;
    const newMessagesCount = afterData.privateMessages?.length || 0;

    if (newMessagesCount > oldMessagesCount) {
      const newMessage = afterData.privateMessages[newMessagesCount - 1];
      const authorId = newMessage.author.id;
      const recipientId = authorId === afterData.client.id ? 
        afterData.awardedProfessional.id : 
        afterData.client.id;

      try {
        const authorDoc = await newMessage.author.get();
        const authorName = authorDoc.data()?.name || "Someone";

        await sendPushNotification(
          recipientId,
          `New Message from ${authorName}`,
          `You have a new message on job: "${afterData.title}"`,
          `/dashboard/jobs/${context.params.jobId}`
        );
      } catch (e) {
        functions.logger.error("Error in onPrivateMessageCreated:", e);
      }
    }
  });

/**
 * Handles reputation points and tier promotions when a job status changes to "Completed".
 */
export const onJobCompleted = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData || beforeData.status === "Completed" || afterData.status !== "Completed") return;

    const profRef = afterData.awardedProfessional;
    if (!profRef) return;

    try {
      const settingsSnap = await db.collection("settings").doc("platform").get();
      const settings = settingsSnap.data() || {};

      const pointsForCompletion = settings.pointsForJobCompletion || 50;
      let pointsEarned = pointsForCompletion;

      if (afterData.rating === 5) pointsEarned += (settings.pointsFor5StarRating || 20);
      else if (afterData.rating === 4) pointsEarned += (settings.pointsFor4StarRating || 10);
      else if (afterData.rating === 1) pointsEarned += (settings.penaltyFor1StarRating || -25);

      await db.runTransaction(async (transaction) => {
        const profDoc = await transaction.get(profRef as admin.firestore.DocumentReference);
        if (!profDoc.exists) return;

        const profData = profDoc.data() || {};
        const currentPoints = profData.professionalProfile?.points || 0;
        const newPoints = currentPoints + pointsEarned;

        let newTier = profData.professionalProfile?.tier || "Bronze";
        if (newPoints >= (settings.platinumTierPoints || 2000)) newTier = "Platinum";
        else if (newPoints >= (settings.goldTierPoints || 1000)) newTier = "Gold";
        else if (newPoints >= (settings.silverTierPoints || 500)) newTier = "Silver";

        transaction.update(profRef as admin.firestore.DocumentReference, {
          "professionalProfile.points": newPoints,
          "professionalProfile.tier": newTier,
          "professionalProfile.reviews": (profData.professionalProfile?.reviews || 0) + 1,
          "professionalProfile.rating": ((profData.professionalProfile?.rating || 0) * (profData.professionalProfile?.reviews || 0) + afterData.rating) / ((profData.professionalProfile?.reviews || 0) + 1),
        });
      });

      sendPushNotification(profRef.id, "Reputation Updated!", `You earned ${pointsEarned} points for completing: "${afterData.title}"`, "/dashboard/profile").catch(() => { /* ignore */ });
    } catch (error) {
      functions.logger.error("Error in onJobCompleted:", error);
    }
  });

/**
 * Awards the "Founding Professional" badge to the first 100 verified Professionals in a district.
 */
export const onUserVerified = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    if (!beforeData || !afterData) return;

    const wasJustVerified = !beforeData.professionalProfile?.verified && afterData.professionalProfile?.verified === true;

    if (wasJustVerified && !afterData.isFoundingProfessional && afterData.district) {
      try {
        const foundingSnap = await db.collection("users")
          .where("isFoundingProfessional", "==", true)
          .where("district", "==", afterData.district)
          .get();

        if (foundingSnap.size < 100) {
          await db.collection("users").doc(context.params.userId).update({ isFoundingProfessional: true });
          sendPushNotification(context.params.userId, "Congratulations!", "You are a Founding Professional!", "/dashboard/profile").catch(() => { /* ignore */ });
        }
      } catch (error) {
        functions.logger.error("Error in onUserVerified:", error);
      }
    }
  });

/**
 * Triggered when there is a date change proposal on a job.
 */
export const onJobDateChange = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    if (!beforeData || !afterData) return;
    const jobId = context.params.jobId;

    if (!beforeData.dateChangeProposal && afterData.dateChangeProposal?.status === "pending") {
        const proposal = afterData.dateChangeProposal;
        const recipientId = proposal.proposedBy === "Client" ? afterData.awardedProfessional.id : afterData.client.id;
        sendPushNotification(recipientId, "Date Change Proposed", `A new start date has been proposed for "${afterData.title}".`, `/dashboard/jobs/${jobId}`).catch(() => { /* ignore */ });
    }

    if (beforeData.dateChangeProposal?.status === "pending" && afterData.dateChangeProposal?.status !== "pending") {
        const wasAccepted = afterData.jobStartDate !== beforeData.jobStartDate;
        const proposerId = beforeData.dateChangeProposal.proposedBy === "Client" ? afterData.client.id : afterData.awardedProfessional.id;
        sendPushNotification(proposerId, `Date Change ${wasAccepted ? "Accepted" : "Rejected"}`, `Your request for "${afterData.title}" was ${wasAccepted ? "accepted" : "rejected"}.`, `/dashboard/jobs/${jobId}`).catch(() => { /* ignore */ });
    }
  });
