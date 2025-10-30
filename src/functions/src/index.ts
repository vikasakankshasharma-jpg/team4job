
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";

admin.initializeApp();

const app = express();

app.post("/cashfree-webhook", (req, res) => {
  console.log("Received Cashfree webhook data:", req.body);
  res.json({ status: "received" });
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
async function sendNotification(userId: string, title: string, body: string, link?: string) {
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

    const payload = {
        notification: {
            title,
            body,
        },
        webpush: {
            fcm_options: {
                link: link || "https://cctv-job-connect.web.app/dashboard",
            },
        },
        tokens: userData.fcmTokens,
    };

    try {
        console.log(`Sending notification to user ${userId} with tokens:`, userData.fcmTokens);
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
            
            if (newBid.installer && typeof newBid.installer.get === 'function') {
              const installerDoc = await newBid.installer.get();
              const installerName = installerDoc.data()?.name || "An installer";

              await sendNotification(
                  jobGiverId,
                  "New Bid on Your Job!",
                  `${installerName} placed a bid of ₹${newBid.amount} on your job: "${afterData.title}"`,
                  `/dashboard/jobs/${context.params.jobId}`
              );
            }
        }
    });

/**
 * Triggered when a job is updated, to notify installers if the job details changed.
 */
export const onJobEdited = functions.firestore
    .document("jobs/{jobId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if the job was edited while open for bidding AND bids were cleared
        if (
            beforeData.status === 'Open for Bidding' &&
            afterData.status === 'Open for Bidding' &&
            (beforeData.bids?.length > 0) &&
            (afterData.bids?.length === 0)
        ) {
            const previousBidderIds = (beforeData.bidderIds || []);
            if (previousBidderIds.length === 0) return;

            const notificationPromises = previousBidderIds.map((installerId: string) => 
                sendNotification(
                    installerId,
                    "Job Updated",
                    `The job "${afterData.title}" has been updated. Please review the changes and bid again if you're still interested.`,
                    `/dashboard/jobs/${context.params.jobId}`
                )
            );

            await Promise.all(notificationPromises);
            console.log(`Notified ${previousBidderIds.length} previous bidders about job update for ${context.params.jobId}`);
        }
    });

/**
 * Triggered when an installer accepts or declines a job offer.
 */
export const onJobAwarded = functions.firestore
    .document("jobs/{jobId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const jobGiverId = afterData.jobGiver.id;

        // Case 1: Installer accepts the job (status changes to 'Pending Funding')
        if (beforeData.status !== 'Pending Funding' && afterData.status === 'Pending Funding') {
            if (afterData.awardedInstaller && typeof afterData.awardedInstaller.get === 'function') {
                const installerDoc = await afterData.awardedInstaller.get();
                const installerName = installerDoc.data()?.name || "The installer";
                await sendNotification(
                    jobGiverId,
                    "Offer Accepted!",
                    `${installerName} has accepted your offer for "${afterData.title}". Please proceed to fund the project.`,
                    `/dashboard/jobs/${context.params.jobId}`
                );
            }
        }
        
        // Case 2: Installer declines the job (status reverts from 'Awarded' to 'Bidding Closed' or 'Open for Bidding')
        const wasAwarded = (beforeData.status === 'Awarded');
        const isNowOpen = (afterData.status === 'Bidding Closed' || afterData.status === 'Open for Bidding');
        if (wasAwarded && isNowOpen && beforeData.awardedInstaller && !afterData.awardedInstaller) {
            if (beforeData.awardedInstaller && typeof beforeData.awardedInstaller.get === 'function') {
                const installerDoc = await beforeData.awardedInstaller.get();
                const installerName = installerDoc.data()?.name || "The installer";
                await sendNotification(
                    jobGiverId,
                    "Offer Declined",
                    `${installerName} has declined your offer for "${afterData.title}". You can now award the job to another installer.`,
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
            const recipientId = authorId === jobGiverId ? awardedInstallerId : jobGiverId;
            
             if (newMessage.author && typeof newMessage.author.get === 'function') {
                const authorDoc = await newMessage.author.get();
                const authorName = authorDoc.data()?.name || "Someone";

                await sendNotification(
                    recipientId,
                    `New Message from ${authorName}`,
                    `You have a new message on job: "${afterData.title}"`,
                    `/dashboard/jobs/${context.params.jobId}`
                );
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
        const jobId = context.params.jobId;

        // Date Change Proposed
        if (!beforeData.dateChangeProposal && afterData.dateChangeProposal && afterData.dateChangeProposal.status === 'pending') {
            const proposal = afterData.dateChangeProposal;
            const jobGiverId = afterData.jobGiver.id;
            const awardedInstallerId = afterData.awardedInstaller.id;
            const proposerId = proposal.proposedBy === 'Job Giver' ? jobGiverId : awardedInstallerId;
            const recipientId = proposal.proposedBy === 'Job Giver' ? awardedInstallerId : jobGiverId;

            const proposerDoc = await admin.firestore().collection("users").doc(proposerId).get();
            const proposerName = proposerDoc.data()?.name || 'The other party';

            await sendNotification(
                recipientId,
                "Date Change Proposed",
                `${proposerName} has proposed a new start date for job: "${afterData.title}".`,
                `/dashboard/jobs/${jobId}`
            );
        }

        // Date Change Accepted/Rejected
        if (beforeData.dateChangeProposal && beforeData.dateChangeProposal.status === 'pending' && !afterData.dateChangeProposal) {
            const proposerId = beforeData.dateChangeProposal.proposedBy === 'Job Giver' ? afterData.jobGiver.id : afterData.awardedInstaller.id;
            const wasAccepted = afterData.jobStartDate !== beforeData.jobStartDate;
            
            await sendNotification(
                proposerId,
                `Date Change ${wasAccepted ? 'Accepted' : 'Rejected'}`,
                `Your proposed date change for job "${afterData.title}" was ${wasAccepted ? 'accepted' : 'rejected'}.`,
                `/dashboard/jobs/${jobId}`
            );
        }
    });


/**
 * Triggered when a job is updated, specifically to handle reputation points
 * and completion notifications.
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

            // Notify Job Giver that job is complete
            await sendNotification(
                afterData.jobGiver.id,
                "Job Completed!",
                `The job "${afterData.title}" has been marked as complete. Please leave a review for the installer.`,
                `/dashboard/jobs/${context.params.jobId}`
            );

            const settingsRef = admin.firestore().collection('settings').doc('platform');
            const settingsSnap = await settingsRef.get();
            const settings = settingsSnap.data() || {};
            
            const pointsForCompletion = settings.pointsForJobCompletion || 50;
            
            try {
                await admin.firestore().runTransaction(async (transaction) => {
                    const installerDoc = await transaction.get(installerRef);
                    if (!installerDoc.exists) {
                        throw new Error("Installer profile not found!");
                    }
                    const installerData = installerDoc.data();
                    if (!installerData || !installerData.installerProfile) {
                        throw new Error("Installer profile data is missing.");
                    }

                    const currentPoints = installerData.installerProfile.points || 0;
                    const newPoints = currentPoints + pointsForCompletion;
                    
                    const silverTierPoints = settings.silverTierPoints || 500;
                    const goldTierPoints = settings.goldTierPoints || 1000;
                    const platinumTierPoints = settings.platinumTierPoints || 2000;

                    let newTier = installerData.installerProfile.tier || 'Bronze';
                    if (newPoints >= platinumTierPoints) {
                        newTier = 'Platinum';
                    } else if (newPoints >= goldTierPoints) {
                        newTier = 'Gold';
                    } else if (newPoints >= silverTierPoints) {
                        newTier = 'Silver';
                    }

                    const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                    
                    const history = installerData.installerProfile.reputationHistory || [];
                    const monthIndex = history.findIndex((h: {month:string}) => h.month === monthYear);
                    if (monthIndex > -1) {
                        history[monthIndex].points = newPoints;
                    } else {
                        history.push({ month: monthYear, points: newPoints });
                    }
                    
                    if (history.length > 12) {
                        history.shift();
                    }

                    transaction.update(installerRef, {
                        'installerProfile.points': newPoints,
                        'installerProfile.tier': newTier,
                        'installerProfile.reputationHistory': history,
                    });
                });
                console.log(`Successfully updated reputation for installer ${installerRef.id}. Awarded ${pointsForCompletion} points for completion.`);
                
                await sendNotification(
                    installerRef.id,
                    "Reputation Updated!",
                    `You earned ${pointsForCompletion} points for completing the job: "${afterData.title}"`,
                    `/dashboard/profile`
                );
            } catch (error) {
                console.error("Error updating reputation for job completion:", error);
            }
        }
        
        // Check if a rating was just added
        if (beforeData.rating !== afterData.rating && afterData.status === "Completed") {
             const installerRef = afterData.awardedInstaller;
            if (!installerRef) return;
            
            const settingsRef = admin.firestore().collection('settings').doc('platform');
            const settingsSnap = await settingsRef.get();
            const settings = settingsSnap.data() || {};
            
            const pointsFor5Star = settings.pointsFor5StarRating || 20;
            const pointsFor4Star = settings.pointsFor4StarRating || 10;
            const penaltyFor1Star = settings.penaltyFor1StarRating || -25;
            
            let ratingPoints = 0;
            if (afterData.rating === 5) ratingPoints = pointsFor5Star;
            else if (afterData.rating === 4) ratingPoints = pointsFor4Star;
            else if (afterData.rating === 1) ratingPoints = penaltyFor1Star;
            else ratingPoints = 0;

            if (ratingPoints === 0) return; // No points change for 2-3 stars

            try {
                 await admin.firestore().runTransaction(async (transaction) => {
                    const installerDoc = await transaction.get(installerRef);
                    if (!installerDoc.exists || !installerDoc.data()?.installerProfile) {
                        throw new Error("Installer profile not found!");
                    }
                    
                    const installerData = installerDoc.data();
                    const currentPoints = installerData!.installerProfile.points || 0;
                    const newPoints = currentPoints + ratingPoints;

                     const silverTierPoints = settings.silverTierPoints || 500;
                    const goldTierPoints = settings.goldTierPoints || 1000;
                    const platinumTierPoints = settings.platinumTierPoints || 2000;

                    let newTier = installerData!.installerProfile.tier || 'Bronze';
                    if (newPoints >= platinumTierPoints) newTier = 'Platinum';
                    else if (newPoints >= goldTierPoints) newTier = 'Gold';
                    else if (newPoints >= silverTierPoints) newTier = 'Silver';

                     const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                    const history = installerData!.installerProfile.reputationHistory || [];
                    const monthIndex = history.findIndex((h: {month:string}) => h.month === monthYear);
                    if (monthIndex > -1) {
                        history[monthIndex].points = newPoints;
                    } else {
                        history.push({ month: monthYear, points: newPoints });
                    }
                    if (history.length > 12) history.shift();

                    transaction.update(installerRef, {
                        'installerProfile.points': newPoints,
                        'installerProfile.tier': newTier,
                        'installerProfile.reputationHistory': history,
                        'installerProfile.reviews': admin.firestore.FieldValue.increment(1)
                    });
                });
                console.log(`Awarded ${ratingPoints} points to ${installerRef.id} for a ${afterData.rating}-star rating.`);
                await sendNotification(
                    installerRef.id,
                    "New Rating Received!",
                    `You received a ${afterData.rating}-star rating for job "${afterData.title}" and your reputation score has been updated.`,
                    `/dashboard/profile`
                );
            } catch (error) {
                console.error("Error updating reputation for rating:", error);
            }
        }
    });

    

    

    