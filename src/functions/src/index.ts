
// Firebase Functions entry point (No 'use server' allowed)

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import express from "express";

admin.initializeApp();

const app = express();

app.post("/cashfree-webhook", async (req, res) => {
  const data = req.body;

  try {
    // 1. Validate Signature (Simplified for MVP, ideally should verify x-webhook-signature)
    // For now, we trust the data structure.

    const orderId = data.data.order.order_id;
    const paymentStatus = data.data.payment.payment_status;

    if (!orderId || !paymentStatus) {
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


          // Notify Professional
          if (transactionData.payeeId) {
            await sendNotification(transactionData.payeeId, "FUNDING SECURED // ESCROW CLEARANCE", "The Client has successfully funded the project escrow. Production phase is now authorized.", "/dashboard/my-bids", true);
          }
        } else {
        }
      } else {
        // It might be a Subscription payment
        // Format: SUB-{userId}-{planId}-{timestamp}
        if (orderId.startsWith("SUB-")) {
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
          }
        } else {
          // No transaction found
        }
      }
    }

    res.json({ status: "processed" });
  } catch (error) {
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
  userId: string, title: string, body: string, link?: string, isUrgent: boolean = false
) {
  try {
    if (!userId) return;

    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData) return;

    let pushSuccess = false;

    // Tier 1: FCM Push Notifications
    if (userData.fcmTokens && userData.fcmTokens.length > 0) {
      const payload: admin.messaging.MulticastMessage = {
        notification: { title, body },
        webpush: { fcmOptions: { link: link || "https://team4job.com/dashboard" } },
        tokens: userData.fcmTokens,
      };

      try {
        const response = await admin.messaging().sendEachForMulticast(payload);
        if (response.successCount > 0) pushSuccess = true;
      } catch (err) { }
    }

    // Tier 2 & 3: WhatsApp Escalation Waterfall
    if (isUrgent && !pushSuccess && userData.phone) {
      const token = process.env.WHATSAPP_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      if (token && phoneNumberId) {
        const lastWaInteraction = userData.lastWhatsappInteraction?.toDate() || new Date(0);
        const isWithin24h = (Date.now() - lastWaInteraction.getTime()) < (24 * 60 * 60 * 1000);
        
        const formattedTo = userData.phone.replace(/\D/g, "");
        const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

        let waPayload = {};
        if (isWithin24h) {
          // Tier 2: Free 24h Text
          waPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedTo,
            type: "text",
            text: { preview_url: false, body: `${title}\n\n${body}` }
          };
        } else {
          // Tier 3: Paid Template (Utility) - Requires 'urgent_alert' template in Meta
          waPayload = {
            messaging_product: "whatsapp",
            to: formattedTo,
            type: "template",
            template: {
              name: 'urgent_alert',
              language: { code: 'en' },
              components: [{ type: "body", parameters: [{ type: "text", text: title }] }]
            }
          };
        }

        try {
          // Dynamic import of node-fetch or native fetch if Node 18+
          const fetchResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(waPayload)
          });
          const fetchResult = await fetchResponse.json();
          if (!fetchResponse.ok) {
            console.error("[Functions WhatsApp Failed]:", JSON.stringify(fetchResult));
          }
        } catch (waErr: any) {
          console.error("[Functions WhatsApp Error]:", waErr.message);
        }
      }
    }
  } catch (error) {
    // Suppress notification errors
  }
}


/**
 * Triggered when a new bid is created on a job.
 * Notifies the Client about the new bid.
 */
export const onBidCreated = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) return;

    const oldBidsCount = beforeData.bids?.length || 0;
    const newBidsCount = afterData.bids?.length || 0;

    // If a new bid was added
    if (newBidsCount > oldBidsCount) {
      const newBid = afterData.bids[newBidsCount - 1];
      const clientId = afterData.client.id;

      if (newBid.professional && typeof newBid.professional.get === "function") {
        try {
          const ProfessionalDoc = await newBid.professional.get();
          const ProfessionalName = ProfessionalDoc.data()?.name || "An Professional";

          await sendNotification(
            clientId,
            "NEW BID PROTOCOL // ACTION REQUIRED",
            `${ProfessionalName} has placed a bid of ₹${newBid.amount} ` +
            `on your project: "${afterData.title.toUpperCase()}"`,
            `/dashboard/jobs/${context.params.jobId}`,
            true
          );
        } catch (e) {
          // Silent failure
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
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) return;

    const oldMessagesCount = beforeData.privateMessages?.length || 0;
    const newMessagesCount = afterData.privateMessages?.length || 0;

    if (newMessagesCount > oldMessagesCount) {
      const newMessage = afterData.privateMessages[newMessagesCount - 1];
      const authorId = newMessage.author.id;
      const clientId = afterData.client.id;
      const awardedProfessionalId = afterData.awardedProfessional.id;

      // Determine the recipient
      const recipientId = authorId === clientId ?
        awardedProfessionalId :
        clientId;

      try {
        const authorDoc = await newMessage.author.get();
        const authorName = authorDoc.data()?.name || "Someone";

        await sendNotification(
          recipientId,
          `New Message from ${authorName}`,
          `You have a new message on job: "${afterData.title}"`,
          `/dashboard/jobs/${context.params.jobId}`,
          true
        );
      } catch (e) {
        // Silent failure
      }
    }
  });

/**
 * Triggered when a job is updated, specifically to handle reputation points
 * and tier promotions when a job status changes to "Completed".
 */
export const onJobCompleted = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) return;

    // Check if the job status just changed to "Completed"
    if (beforeData.status !== "Completed" && afterData.status === "Completed") {
      const ProfessionalRef = afterData.awardedProfessional;
      if (!ProfessionalRef) {
        return;
      }

      const db = admin.firestore();
      const settingsRef = db.collection("settings").doc("platform");
      const settingsSnap = await settingsRef.get();
      const settings = settingsSnap.data() || {};

      // Default reputation values
      const pointsForCompletion = settings.pointsForJobCompletion || 50;
      const silverTierPoints = settings.silverTierPoints || 500;
      const goldTierPoints = settings.goldTierPoints || 1000;
      const platinumTierPoints = settings.platinumTierPoints || 2000;

      try {
        await db.runTransaction(async (transaction) => {
          const ProfessionalDoc = await transaction.get(ProfessionalRef as admin.firestore.DocumentReference);
          if (!ProfessionalDoc.exists) throw new Error("Professional profile not found!");
          const ProfessionalData = ProfessionalDoc.data();
          if (!ProfessionalData || !ProfessionalData.professionalProfile) throw new Error("Professional profile data is missing.");

          const currentPoints = ProfessionalData.professionalProfile.points || 0;
          const newPoints = currentPoints + pointsForCompletion;

          let newTier = ProfessionalData.professionalProfile.tier || "Bronze";
          if (newPoints >= platinumTierPoints) newTier = "Platinum";
          else if (newPoints >= goldTierPoints) newTier = "Gold";
          else if (newPoints >= silverTierPoints) newTier = "Silver";

          const monthYear = new Date().toLocaleString("default", { month: "long", year: "numeric" });
          const history = ProfessionalData.professionalProfile.reputationHistory || [];
          const monthIndex = history.findIndex((h: { month: string; }) => h.month === monthYear);

          if (monthIndex > -1) {
            history[monthIndex].points += pointsForCompletion;
          } else {
            history.push({ month: monthYear, points: pointsForCompletion });
          }
          if (history.length > 12) history.shift();

          transaction.update(ProfessionalRef, {
            "professionalProfile.points": newPoints,
            "professionalProfile.tier": newTier,
            "professionalProfile.reputationHistory": history
          });
        });

        // Fire and forget notification
        sendNotification(ProfessionalRef.id, "REPUTATION ACCRUED // AWARD TIER SYNC", `You earned ${pointsForCompletion} points for the successful completion of project: "${afterData.title.toUpperCase()}"`, "/dashboard/profile").catch(() => {});
      } catch (error) {
        // Silent failure
      }
    }
  });

/**
 * Handles scheduled cleanup of jobs that are stuck in "Pending Funding".
 * Runs every 6 hours.
 */
export const handleUnfundedJobs = functions.pubsub.schedule(
  "every 6 hours"
).onRun(async (context: functions.EventContext) => {
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
    return null;
  }

  const batch = admin.firestore().batch();
  const notificationPromises: Promise<void>[] = [];

  snapshot.docs.forEach((doc) => {
    const job = doc.data();
    batch.update(doc.ref, { status: "Cancelled" });

    // Notify Client
    notificationPromises.push(sendNotification(
      job.client.id,
      "Job Cancelled",
      `Your job "${job.title}" was automatically cancelled ` +
      "because it was not funded within 48 hours of acceptance.",
      `/dashboard/jobs/${doc.id}`,
      true
    ));

    // Notify Professional
    notificationPromises.push(sendNotification(
      job.awardedProfessional.id,
      "Job Cancelled",
      `Job "${job.title}" was cancelled as the Client did not ` +
      "complete payment. You are now free to bid on other jobs.",
      `/dashboard/jobs/${doc.id}`,
      true
    ));
  });

  await batch.commit();
  // Ensure we don't crash if notifications fail
  await Promise.allSettled(notificationPromises);

  return null;
});

/**
 * Implements the "Job Rescue Plan" for jobs that have officially become "Unbid".
 * Runs every hour.
 */
export const handleUnbidJobs = functions.pubsub.schedule("every 1 hours").onRun(async (context: functions.EventContext) => {
  const db = admin.firestore();

  // Query for jobs that are 'Unbid' and haven't been updated to 'Needs Assistance'
  const unbidQuery = db.collection("jobs")
    .where("status", "==", "Unbid");

  const unbidSnapshot = await unbidQuery.get();

  if (unbidSnapshot.empty) {
    return null;
  }

  unbidSnapshot.forEach(async (doc) => {
    const job = doc.data();
    await doc.ref.update({ status: "Needs Assistance" });

    // Notify the Client that their job needs attention and present recovery options.
    sendNotification(
      job.client.id,
      "RESCUE PROTOCOL // ATTENTION REQUIRED",
      `Project "${job.title.toUpperCase()}" has not received bids. Activation of recovery procedures is recommended.`,
      `/dashboard/jobs/${doc.id}`,
      true
    ).catch(() => {});
  });

  return null;
});


/**
 * Triggered when there is a date change proposal on a job.
 */
export const onJobDateChange = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    if (!beforeData || !afterData) return;
    const jobId = context.params.jobId;

    // Date Change Proposed
    if (!beforeData.dateChangeProposal &&
      afterData.dateChangeProposal &&
      afterData.dateChangeProposal.status === "pending") {
      const proposal = afterData.dateChangeProposal;
      const clientId = afterData.client.id;
      const awardedProfessionalId = afterData.awardedProfessional.id;
      const proposerId = proposal.proposedBy === "Client" ?
        clientId :
        awardedProfessionalId;
      const recipientId = proposal.proposedBy === "Client" ?
        awardedProfessionalId :
        clientId;

      try {
        const proposerDoc = await admin.firestore().collection("users")
          .doc(proposerId).get();
        const proposerName = proposerDoc.data()?.name || "The other party";

        await sendNotification(
          recipientId,
          "Date Change Proposed",
          `${proposerName} has proposed a new start date for job: "${afterData.title
          }".`,
          `/dashboard/jobs/${jobId}`,
          true
        );
      } catch (e) { /* Silent */ }
    }

    // Date Change Accepted/Rejected
    if (beforeData.dateChangeProposal?.status === "pending" &&
      (afterData.dateChangeProposal?.status !== "pending")) {
      const wasAccepted = afterData.jobStartDate !== beforeData.jobStartDate;
      const proposerId = beforeData.dateChangeProposal.proposedBy ===
        "Client" ? afterData.client.id : afterData.awardedProfessional.id;

      sendNotification(
        proposerId,
        `Date Change ${wasAccepted ? "Accepted" : "Rejected"}`,
        `Your proposed date change for job "${afterData.title}" was ${wasAccepted ? "accepted" : "rejected"
        }.`,
        `/dashboard/jobs/${jobId}`
      ).catch(() => {});
    }
  });

/**
 * Handles scheduled cleanup of jobs where the award offer has expired.
 * Runs every hour.
 */
export const handleExpiredAwards = functions.pubsub.schedule(
  "every 1 hours"
).onRun(async (context: functions.EventContext) => {
  const now = admin.firestore.Timestamp.now();

  const q = admin.firestore().collection("jobs")
    .where("status", "==", "Awarded")
    .where("acceptanceDeadline", "<=", now);

  const snapshot = await q.get();

  if (snapshot.empty) {
    return null;
  }

  const batch = admin.firestore().batch();
  const notificationPromises: Promise<void>[] = [];

  snapshot.docs.forEach((doc) => {
    const job = doc.data();

    const timedOutprofessionalIds = (job.selectedProfessionals || []).map(
      (s: { professionalId: string; }) => s.professionalId
    );

    // Notify each Professional whose offer expired
    timedOutprofessionalIds.forEach((professionalId: string) => {
      notificationPromises.push(sendNotification(
        professionalId,
        "Offer Expired",
        `Your offer for job "${job.title}" has expired. You can request to re-apply from the job page.`,
        `/dashboard/jobs/${doc.id}`,
        true
      ));
    });

    batch.update(doc.ref, {
      status: "Bidding Closed",
      awardedProfessional: admin.firestore.FieldValue.delete(),
      acceptanceDeadline: admin.firestore.FieldValue.delete(),
      selectedProfessionals: [],
      disqualifiedProfessionalIds: admin.firestore.FieldValue.arrayUnion(
        ...timedOutprofessionalIds
      ),
    });

    // Notify Client that the offer expired
    notificationPromises.push(sendNotification(
      job.client.id,
      "Offer Expired",
      `Your offer for job "${job.title}" expired without being accepted. ` +
      "You can now award it to another Professional.",
      `/dashboard/jobs/${doc.id}`,
      true
    ));
  });

  await batch.commit();
  await Promise.allSettled(notificationPromises);

  return null;
});

/**
 * Triggered when a user's verification status changes.
 * Awards the "Founding Professional" badge to the first 100 verified Professionals in a district.
 */
export const onUserVerified = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const userId = context.params.userId;

    if (!beforeData || !afterData) return;
    const beforeprofessionalProfile = beforeData.professionalProfile;
    const afterprofessionalProfile = afterData.professionalProfile;

    const wasJustVerified = (beforeData.professionalProfile?.verified === false || beforeData.professionalProfile?.verified === undefined) && afterData.professionalProfile?.verified === true;

    if (wasJustVerified && !afterData.isFoundingProfessional && afterData.district) {
      const db = admin.firestore();

      try {
        // Query must be done outside the transaction
        const foundingProfessionalsQuery = db.collection("users")
          .where("isFoundingProfessional", "==", true)
          .where("district", "==", afterData.district);
        const foundingProfessionalsSnap = await foundingProfessionalsQuery.get();

        if (foundingProfessionalsSnap.size < 100) {
          await db.runTransaction(async (transaction) => {
            // Re-verify inside transaction to ensure atomicity, even though it's not ideal.
            // For this specific, low-contention case, it's acceptable.
            const userRef = db.collection("users").doc(userId);
            const freshSnap = await transaction.get(userRef);
            if (freshSnap.exists && !freshSnap.data()?.isFoundingProfessional) {
              transaction.update(userRef, { isFoundingProfessional: true });
            }
          });

          await sendNotification(
            userId,
            "Congratulations, You're a Founding Professional!",
            `You are one of the first 100 Professionals in ${afterData.district} to be verified. Enjoy your exclusive badge!`,
            "/dashboard/profile"
          );
        } else {
        }
      } catch (error) {
        // Silent failure
      }
    }
  });
















