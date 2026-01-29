
// Firebase Functions entry point (No 'use server' allowed)

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";

admin.initializeApp();

const app = express();

app.post("/cashfree-webhook", async (req, res) => {
  const data = req.body;
  console.log("Received Cashfree webhook data:", JSON.stringify(data, null, 2));

  try {
    // 1. Validate Signature (Simplified for MVP, ideally should verify x-webhook-signature)
    // For now, we trust the data structure.

    const orderId = data.data.order.order_id;
    const paymentStatus = data.data.payment.payment_status;

    if (!orderId || !paymentStatus) {
      console.error("Invalid webhook payload");
      res.status(400).json({ status: "invalid_payload" });
      return;
    }

    if (paymentStatus === "SUCCESS") {
      const db = admin.firestore();

      // The orderId format is usually `SUB-${userId}-${planId}-${timestamp}` or a value from transactions.
      // However, we need to map this back to our `transactions` collection.
      // Assuming we store the `orderId` in the transaction document or use the transaction ID as orderId.

      // Search for the transaction with this order ID (if we stored it) OR
      // If the orderId IS the transactionId (which is common practice).

      // Let's try to find a transaction where orderId matches.
      const transactionQuery = await db.collection("transactions").where("gatewayOrderId", "==", orderId).limit(1).get();

      if (!transactionQuery.empty) {
        const transactionDoc = transactionQuery.docs[0];
        const transactionData = transactionDoc.data();

        if (transactionData.status !== "Funded") {
          await db.runTransaction(async (t) => {
            t.update(transactionDoc.ref, { status: "Funded", gatewayRawData: data });

            // Also update the JOB status if this was a job payment
            if (transactionData.jobId && transactionData.jobId.startsWith("JOB-")) {
              const jobRef = db.collection("jobs").doc(transactionData.jobId);
              t.update(jobRef, { status: "In Progress" }); // Or "Funded" / "Pending Start"
            }
          });

          console.log(`Transaction ${transactionDoc.id} funded successfully.`);

          // Notify Installer
          if (transactionData.payeeId) {
            await sendNotification(transactionData.payeeId, "Payment Secured!", "The Job Giver has funded the escrow. You can start the work.", "/dashboard/my-bids");
          }
        } else {
          console.log(`Transaction ${transactionDoc.id} already funded.`);
        }
      } else {
        // It might be a Subscription payment
        // Format: SUB-{userId}-{planId}-{timestamp}
        if (orderId.startsWith("SUB-")) {
          console.log("Processing subscription webhook...");
          const parts = orderId.split("-");
          if (parts.length >= 3) {
            const userId = parts[1];
            const planId = parts[2];
            // const timestamp = parts[3];

            await db.runTransaction(async (t) => {
              const userRef = db.collection("users").doc(userId);
              const userDoc = await t.get(userRef);
              if (userDoc.exists) {
                // Fetch plan details to calculate expiry
                const planSnapshot = await db.collection("subscriptionPlans").doc(planId).get();
                const planData = planSnapshot.data();
                const durationDays = planData?.durationDays || 365; // Default 1 year

                const now = new Date();
                const currentExpiry = userDoc.data()?.subscription?.expiresAt?.toDate() || now;
                const startDate = currentExpiry > now ? currentExpiry : now;
                const newExpiry = new Date(startDate);
                newExpiry.setDate(newExpiry.getDate() + durationDays);

                t.update(userRef, {
                  subscription: {
                    planId: planId,
                    planName: planData?.name || "Premium",
                    expiresAt: newExpiry,
                    isActive: true
                  }
                });
              }
            });
            console.log(`Subscription updated for user ${userId}`);
          }
        } else {
          console.warn(`No transaction found for orderId: ${orderId}`);
        }
      }
    }

    res.json({ status: "processed" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ status: "error" });
  }
});

export const api = functions.https.onRequest(app);

// --- Push Notification Functions ---

/**
 * Sends a push notification to a user.
 * @param {string} userId The UID of the user to notify.
 * @param {string} title The title of the notification.
 * @param {string} body The body of the notification.
 * @param {string} [link] Optional deep link for the notification.
 */
async function sendNotification(
  userId: string, title: string, body: string, link?: string
) {
  try {
    if (!userId) {
      console.log("No user ID provided, skipping notification.");
      return;
    }

    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
      console.log(`User ${userId} has no FCM tokens. Cannot send notification.`);
      return;
    }

    const payload: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      webpush: {
        fcmOptions: {
          link: link || "https://cctv-job-connect.web.app/dashboard",
        },
      },
      tokens: userData.fcmTokens,
    };

    console.log(
      `Sending notification to user ${userId} with tokens:`,
      userData.fcmTokens
    );
    const response = await admin.messaging().sendMulticast(payload);
    console.log("Successfully sent message:", response);
    // You can also handle failures and remove invalid tokens here
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    // Suppress error so calling functions don't fail
  }
}


/**
 * Triggered when a new bid is created on a job.
 * Notifies the Job Giver about the new bid.
 */
export const onBidCreated = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const oldBidsCount = beforeData.bids?.length || 0;
    const newBidsCount = afterData.bids?.length || 0;

    // If a new bid was added
    if (newBidsCount > oldBidsCount) {
      const newBid = afterData.bids[newBidsCount - 1];
      const jobGiverId = afterData.jobGiver.id;

      if (newBid.installer && typeof newBid.installer.get === "function") {
        try {
          const installerDoc = await newBid.installer.get();
          const installerName = installerDoc.data()?.name || "An installer";

          await sendNotification(
            jobGiverId,
            "New Bid on Your Job!",
            `${installerName} placed a bid of ₹${newBid.amount} ` +
            `on your job: "${afterData.title}"`,
            `/dashboard/jobs/${context.params.jobId}`
          );
        } catch (e) {
          console.error("Error sending bid notification:", e);
        }
      }
    }
  });

/**
 * Triggered when a new private message is added to a job.
 * Notifies the recipient.
 */
export const onPrivateMessageCreated = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const oldMessagesCount = beforeData.privateMessages?.length || 0;
    const newMessagesCount = afterData.privateMessages?.length || 0;

    if (newMessagesCount > oldMessagesCount) {
      const newMessage = afterData.privateMessages[newMessagesCount - 1];
      const authorId = newMessage.author.id;
      const jobGiverId = afterData.jobGiver.id;
      const awardedInstallerId = afterData.awardedInstaller.id;

      // Determine the recipient
      const recipientId = authorId === jobGiverId ?
        awardedInstallerId :
        jobGiverId;

      try {
        const authorDoc = await newMessage.author.get();
        const authorName = authorDoc.data()?.name || "Someone";

        await sendNotification(
          recipientId,
          `New Message from ${authorName}`,
          `You have a new message on job: "${afterData.title}"`,
          `/dashboard/jobs/${context.params.jobId}`
        );
      } catch (e) {
        console.error("Error sending message notification:", e);
      }
    }
  });

/**
 * Triggered when a job is updated, specifically to handle reputation points
 * and tier promotions when a job status changes to "Completed".
 */
export const onJobCompleted = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if the job status just changed to "Completed"
    if (beforeData.status !== "Completed" && afterData.status === "Completed") {
      const installerRef = afterData.awardedInstaller;
      if (!installerRef) {
        console.log(`Job ${context.params.jobId} completed without an awarded installer.`);
        return;
      }

      const db = admin.firestore();
      const settingsRef = db.collection("settings").doc("platform");
      const settingsSnap = await settingsRef.get();
      const settings = settingsSnap.data() || {};

      // Default reputation values
      const pointsForCompletion = settings.pointsForJobCompletion || 50;
      const pointsFor5Star = settings.pointsFor5StarRating || 20;
      const pointsFor4Star = settings.pointsFor4StarRating || 10;
      const penaltyFor1Star = settings.penaltyFor1StarRating || -25;

      const silverTierPoints = settings.silverTierPoints || 500;
      const goldTierPoints = settings.goldTierPoints || 1000;
      const platinumTierPoints = settings.platinumTierPoints || 2000;

      let pointsEarned = pointsForCompletion;
      if (afterData.rating === 5) {
        pointsEarned += pointsFor5Star;
      } else if (afterData.rating === 4) {
        pointsEarned += pointsFor4Star;
      } else if (afterData.rating === 1) {
        pointsEarned += penaltyFor1Star;
      }

      let finalAverageRating = 0;
      let finalReviewCount = 0;

      try {
        await db.runTransaction(async (transaction) => {
          const installerDoc = await transaction.get(installerRef);
          if (!installerDoc.exists) throw new Error("Installer profile not found!");
          const installerData = installerDoc.data();
          if (!installerData || !installerData.installerProfile) throw new Error("Installer profile data is missing.");

          const currentPoints = installerData.installerProfile.points || 0;
          const newPoints = currentPoints + pointsEarned;

          let newTier = installerData.installerProfile.tier || "Bronze";
          if (newPoints >= platinumTierPoints) newTier = "Platinum";
          else if (newPoints >= goldTierPoints) newTier = "Gold";
          else if (newPoints >= silverTierPoints) newTier = "Silver";

          const monthYear = new Date().toLocaleString("default", { month: "long", year: "numeric" });
          const history = installerData.installerProfile.reputationHistory || [];
          const monthIndex = history.findIndex((h: { month: string; }) => h.month === monthYear);

          if (monthIndex > -1) {
            history[monthIndex].points += pointsEarned;
          } else {
            const lastMonth = history.length > 0 ? history[history.length - 1] : { points: 0 };
            history.push({ month: monthYear, points: lastMonth.points + pointsEarned });
          }
          if (history.length > 12) history.shift();

          const currentReviews = installerData.installerProfile.reviews || 0;
          const newReviewCount = currentReviews + 1;
          const currentTotalRating = (installerData.installerProfile.rating || 0) * currentReviews;
          const newAverageRating = (currentTotalRating + afterData.rating) / newReviewCount;

          finalAverageRating = newAverageRating;
          finalReviewCount = newReviewCount;

          transaction.update(installerRef, {
            "installerProfile.points": newPoints,
            "installerProfile.tier": newTier,
            "installerProfile.reputationHistory": history,
            "installerProfile.reviews": newReviewCount,
            "installerProfile.rating": newAverageRating,
          });
        });

        console.log(`Successfully updated reputation for installer ${installerRef.id}. Awarded ${pointsEarned} points.`);

        // Fire and forget notification
        sendNotification(installerRef.id, "Reputation Updated!", `You earned ${pointsEarned} points for completing the job: "${afterData.title}"`, "/dashboard/profile").catch(console.error);

        // --- Pro Installer Promotion Logic ---
        // Re-fetch the document AFTER the transaction to get the latest data.
        const installerDoc = await installerRef.get();
        const installerData = installerDoc.data();
        if (installerData && installerData.installerProfile.tier === "Bronze") {
          const disputesQuery = db.collection("disputes").where("parties.installerId", "==", installerRef.id).where("status", "!=", "Resolved");
          const disputesSnap = await disputesQuery.get();

          if (finalReviewCount >= 5 && finalAverageRating >= 4.5 && disputesSnap.empty) {
            await installerRef.update({ "installerProfile.tier": "Silver" });
            console.log(`Promoted installer ${installerRef.id} to Pro Installer (Silver).`);
            sendNotification(installerRef.id, "Congratulations! You're a Pro Installer!", "You have been promoted to a Pro Installer for your excellent performance.", "/dashboard/profile").catch(console.error);
          }
        }

      } catch (error) {
        console.error("Error updating reputation or tier:", error);
      }
    }
  });

/**
 * Handles scheduled cleanup of jobs that are stuck in "Pending Funding".
 * Runs every 6 hours.
 */
export const handleUnfundedJobs = functions.pubsub.schedule(
  "every 6 hours"
).onRun(async (context) => {
  console.log("Running scheduled function to handle stale funding...");
  const now = admin.firestore.Timestamp.now();

  // Set deadline to 48 hours ago
  const fortyEightHoursAgo = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 48 * 60 * 60 * 1000
  );

  const q = admin.firestore().collection("jobs")
    .where("status", "==", "Pending Funding")
    .where("fundingDeadline", "<=", fortyEightHoursAgo);

  const snapshot = await q.get();

  if (snapshot.empty) {
    console.log("No stale unfunded jobs found.");
    return null;
  }

  const batch = admin.firestore().batch();
  const notificationPromises: Promise<void>[] = [];

  snapshot.docs.forEach((doc) => {
    const job = doc.data();
    console.log(`Cancelling job ${doc.id} due to funding timeout.`);
    batch.update(doc.ref, { status: "Cancelled" });

    // Notify Job Giver
    notificationPromises.push(sendNotification(
      job.jobGiver.id,
      "Job Cancelled",
      `Your job "${job.title}" was automatically cancelled ` +
      "because it was not funded within 48 hours of acceptance.",
      `/dashboard/jobs/${doc.id}`
    ));

    // Notify Installer
    notificationPromises.push(sendNotification(
      job.awardedInstaller.id,
      "Job Cancelled",
      `Job "${job.title}" was cancelled as the Job Giver did not ` +
      "complete payment. You are now free to bid on other jobs.",
      `/dashboard/jobs/${doc.id}`
    ));
  });

  await batch.commit();
  // Ensure we don't crash if notifications fail
  await Promise.allSettled(notificationPromises);

  console.log(`Cancelled ${snapshot.size} unfunded jobs.`);
  return null;
});

/**
 * Implements the "Job Rescue Plan" for jobs that have officially become "Unbid".
 * Runs every hour.
 */
export const handleUnbidJobs = functions.pubsub.schedule("every 1 hours").onRun(async (context) => {
  console.log("Running Job Rescue Plan for Unbid jobs...");
  const db = admin.firestore();

  // Query for jobs that are 'Unbid' and haven't been updated to 'Needs Assistance'
  const unbidQuery = db.collection("jobs")
    .where("status", "==", "Unbid");

  const unbidSnapshot = await unbidQuery.get();

  if (unbidSnapshot.empty) {
    console.log("No 'Unbid' jobs found needing assistance.");
    return null;
  }

  unbidSnapshot.forEach(async (doc) => {
    const job = doc.data();
    await doc.ref.update({ status: "Needs Assistance" });
    console.log(`Job Rescue: Job ${doc.id} moved to 'Needs Assistance'.`);

    // Notify the Job Giver that their job needs attention and present recovery options.
    sendNotification(
      job.jobGiver.id,
      "Your Job Needs Attention",
      `Your job "${job.title}" did not receive any bids. You can now re-post or promote it from the job page.`,
      `/dashboard/jobs/${doc.id}`
    ).catch(console.error);
  });

  return null;
});


/**
 * Triggered when there is a date change proposal on a job.
 */
export const onJobDateChange = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const jobId = context.params.jobId;

    // Date Change Proposed
    if (!beforeData.dateChangeProposal &&
      afterData.dateChangeProposal &&
      afterData.dateChangeProposal.status === "pending") {
      const proposal = afterData.dateChangeProposal;
      const jobGiverId = afterData.jobGiver.id;
      const awardedInstallerId = afterData.awardedInstaller.id;
      const proposerId = proposal.proposedBy === "Job Giver" ?
        jobGiverId :
        awardedInstallerId;
      const recipientId = proposal.proposedBy === "Job Giver" ?
        awardedInstallerId :
        jobGiverId;

      try {
        const proposerDoc = await admin.firestore().collection("users")
          .doc(proposerId).get();
        const proposerName = proposerDoc.data()?.name || "The other party";

        await sendNotification(
          recipientId,
          "Date Change Proposed",
          `${proposerName} has proposed a new start date for job: "${afterData.title
          }".`,
          `/dashboard/jobs/${jobId}`
        );
      } catch (e) { console.error(e); }
    }

    // Date Change Accepted/Rejected
    if (beforeData.dateChangeProposal?.status === "pending" &&
      (afterData.dateChangeProposal?.status !== "pending")) {
      const wasAccepted = afterData.jobStartDate !== beforeData.jobStartDate;
      const proposerId = beforeData.dateChangeProposal.proposedBy ===
        "Job Giver" ? afterData.jobGiver.id : afterData.awardedInstaller.id;

      sendNotification(
        proposerId,
        `Date Change ${wasAccepted ? "Accepted" : "Rejected"}`,
        `Your proposed date change for job "${afterData.title}" was ${wasAccepted ? "accepted" : "rejected"
        }.`,
        `/dashboard/jobs/${jobId}`
      ).catch(console.error);
    }
  });

/**
 * Handles scheduled cleanup of jobs where the award offer has expired.
 * Runs every hour.
 */
export const handleExpiredAwards = functions.pubsub.schedule(
  "every 1 hours"
).onRun(async (context) => {
  console.log("Running scheduled function to handle expired job awards...");
  const now = admin.firestore.Timestamp.now();

  const q = admin.firestore().collection("jobs")
    .where("status", "==", "Awarded")
    .where("acceptanceDeadline", "<=", now);

  const snapshot = await q.get();

  if (snapshot.empty) {
    console.log("No expired awards found.");
    return null;
  }

  const batch = admin.firestore().batch();
  const notificationPromises: Promise<void>[] = [];

  snapshot.docs.forEach((doc) => {
    const job = doc.data();
    console.log(
      `Reverting job ${doc.id} to 'Bidding Closed' due to expired award.`
    );

    const timedOutInstallerIds = (job.selectedInstallers || []).map(
      (s: { installerId: string; }) => s.installerId
    );

    // Notify each installer whose offer expired
    timedOutInstallerIds.forEach(installerId => {
      notificationPromises.push(sendNotification(
        installerId,
        "Offer Expired",
        `Your offer for job "${job.title}" has expired. You can request to re-apply from the job page.`,
        `/dashboard/jobs/${doc.id}`
      ));
    });

    batch.update(doc.ref, {
      status: "Bidding Closed",
      awardedInstaller: admin.firestore.FieldValue.delete(),
      acceptanceDeadline: admin.firestore.FieldValue.delete(),
      selectedInstallers: [],
      disqualifiedInstallerIds: admin.firestore.FieldValue.arrayUnion(
        ...timedOutInstallerIds
      ),
    });

    // Notify Job Giver that the offer expired
    notificationPromises.push(sendNotification(
      job.jobGiver.id,
      "Offer Expired",
      `Your offer for job "${job.title}" expired without being accepted. ` +
      "You can now award it to another installer.",
      `/dashboard/jobs/${doc.id}`
    ));
  });

  await batch.commit();
  await Promise.allSettled(notificationPromises);

  console.log(`Processed ${snapshot.size} expired awards.`);
  return null;
});

/**
 * Triggered when a user's verification status changes.
 * Awards the "Founding Installer" badge to the first 100 verified installers in a district.
 */
export const onUserVerified = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const userId = context.params.userId;

    const wasJustVerified = (beforeData.installerProfile?.verified === false || beforeData.installerProfile?.verified === undefined) && afterData.installerProfile?.verified === true;

    if (wasJustVerified && !afterData.isFoundingInstaller && afterData.district) {
      console.log(`User ${userId} in district ${afterData.district} has just been verified. Checking for Founding Installer eligibility.`);
      const db = admin.firestore();

      try {
        // Query must be done outside the transaction
        const foundingInstallersQuery = db.collection("users")
          .where("isFoundingInstaller", "==", true)
          .where("district", "==", afterData.district);
        const foundingInstallersSnap = await foundingInstallersQuery.get();

        if (foundingInstallersSnap.size < 100) {
          await db.runTransaction(async (transaction) => {
            // Re-verify inside transaction to ensure atomicity, even though it's not ideal.
            // For this specific, low-contention case, it's acceptable.
            const userRef = db.collection("users").doc(userId);
            const freshSnap = await transaction.get(userRef);
            if (freshSnap.exists() && !freshSnap.data()?.isFoundingInstaller) {
              console.log(`Founding Installer count in ${afterData.district} is ${foundingInstallersSnap.size}. Awarding badge to user ${userId}.`);
              transaction.update(userRef, { isFoundingInstaller: true });
            }
          });

          await sendNotification(
            userId,
            "Congratulations, You're a Founding Installer!",
            `You are one of the first 100 installers in ${afterData.district} to be verified. Enjoy your exclusive badge!`,
            "/dashboard/profile"
          );
        } else {
          console.log(`Founding Installer program in ${afterData.district} is full. No badge awarded.`);
        }
      } catch (error) {
        console.error(`Error in Founding Installer transaction for user ${userId}:`, error);
      }
    }
  });















