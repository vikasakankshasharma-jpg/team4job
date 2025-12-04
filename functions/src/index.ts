
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";

admin.initializeApp();

const app = express();

app.post("/cashfree-webhook", (req, res) => {
  console.log("Received Cashfree webhook data:", req.body);
  res.json({status: "received"});
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

  try {
    console.log(
        `Sending notification to user ${userId} with tokens:`,
        userData.fcmTokens
    );
    const response = await admin.messaging().sendMulticast(payload);
    console.log("Successfully sent message:", response);
    // You can also handle failures and remove invalid tokens here
  } catch (error) {
    console.error("Error sending message:", error);
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
          const installerDoc = await newBid.installer.get();
          const installerName = installerDoc.data()?.name || "An installer";

          await sendNotification(
              jobGiverId,
              "New Bid on Your Job!",
              `${installerName} placed a bid of ₹${newBid.amount} ` +
              `on your job: "${afterData.title}"`,
              `/dashboard/jobs/${context.params.jobId}`
          );
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

        const authorDoc = await newMessage.author.get();
        const authorName = authorDoc.data()?.name || "Someone";

        await sendNotification(
            recipientId,
            `New Message from ${authorName}`,
            `You have a new message on job: "${afterData.title}"`,
            `/dashboard/jobs/${context.params.jobId}`
        );
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
            if (afterData.rating === 5) pointsEarned += pointsFor5Star;
            else if (afterData.rating === 4) pointsEarned += pointsFor4Star;
            else if (afterData.rating === 1) pointsEarned += penaltyFor1Star;

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
                    const monthIndex = history.findIndex((h) => h.month === monthYear);
                    if (monthIndex > -1) history[monthIndex].points = newPoints;
                    else history.push({ month: monthYear, points: newPoints });
                    if (history.length > 12) history.shift();

                    const newReviewCount = (installerData.installerProfile.reviews || 0) + 1;

                    transaction.update(installerRef, {
                        "installerProfile.points": newPoints,
                        "installerProfile.tier": newTier,
                        "installerProfile.reputationHistory": history,
                        "installerProfile.reviews": newReviewCount,
                    });
                });

                console.log(`Successfully updated reputation for installer ${installerRef.id}. Awarded ${pointsEarned} points.`);
                await sendNotification(installerRef.id, "Reputation Updated!", `You earned ${pointsEarned} points for completing the job: "${afterData.title}"`, "/dashboard/profile");

                // --- Pro Installer Promotion Logic ---
                const installerDoc = await installerRef.get();
                const installerData = installerDoc.data();
                if (installerData && installerData.installerProfile.tier === "Bronze") {
                    const completedJobsQuery = db.collection("jobs").where("awardedInstaller", "==", installerRef).where("status", "==", "Completed");
                    const completedJobsSnap = await completedJobsQuery.get();
                    const completedJobsCount = completedJobsSnap.size;
                    
                    const totalRating = (installerData.installerProfile.rating || 0) * (installerData.installerProfile.reviews || 0);
                    const newAverageRating = (totalRating + afterData.rating) / ((installerData.installerProfile.reviews || 0) + 1);

                    const disputesQuery = db.collection("disputes").where("parties.installerId", "==", installerRef.id).where("status", "!=", "Resolved");
                    const disputesSnap = await disputesQuery.get();

                    if (completedJobsCount >= 5 && newAverageRating >= 4.5 && disputesSnap.empty) {
                        await installerRef.update({ "installerProfile.tier": "Silver" });
                        console.log(`Promoted installer ${installerRef.id} to Pro Installer (Silver).`);
                        await sendNotification(installerRef.id, "Congratulations! You're a Pro Installer!", "You have been promoted to a Pro Installer for your excellent performance.", "/dashboard/profile");
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
    batch.update(doc.ref, {status: "Cancelled"});

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
  await Promise.all(notificationPromises);

  console.log(`Cancelled ${snapshot.size} unfunded jobs.`);
  return null;
});

/**
 * Triggered when a user's verification status changes.
 * Awards the "Founding Installer" badge to the first 100 verified installers.
 */
export const onUserVerified = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const userId = context.params.userId;

        const wasJustVerified = (beforeData.installerProfile?.verified === false || beforeData.installerProfile?.verified === undefined) && afterData.installerProfile?.verified === true;

        if (wasJustVerified && !afterData.isFoundingInstaller) {
            console.log(`User ${userId} has just been verified. Checking for Founding Installer eligibility.`);
            const db = admin.firestore();
            try {
                await db.runTransaction(async (transaction) => {
                    const foundingInstallersQuery = db.collection("users").where("isFoundingInstaller", "==", true);
                    const foundingInstallersSnap = await transaction.get(foundingInstallersQuery);

                    if (foundingInstallersSnap.size < 100) {
                        console.log(`Founding Installer count is ${foundingInstallersSnap.size}. Awarding badge to user ${userId}.`);
                        const userRef = db.collection("users").doc(userId);
                        transaction.update(userRef, { isFoundingInstaller: true });

                        // Notification will be sent outside the transaction after it commits.
                    } else {
                        console.log("Founding Installer program is full. No badge awarded.");
                    }
                });

                // Re-fetch the user doc to confirm the badge was awarded before notifying.
                const finalUserDoc = await db.collection("users").doc(userId).get();
                if (finalUserDoc.data()?.isFoundingInstaller) {
                    await sendNotification(
                        userId,
                        "Congratulations, You're a Founding Installer!",
                        "You are one of the first 100 installers to be verified on our platform. Enjoy your exclusive badge!",
                        "/dashboard/profile"
                    );
                }
            } catch (error) {
                console.error(`Error in Founding Installer transaction for user ${userId}:`, error);
            }
        }
    });

    
