

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

    if (!userData || !userData.fcmTokens || !userData.fcmTokens.length === 0) {
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
 * Triggered when a job's status changes.
 */
export const onJobStatusChange = functions.firestore
    .document("jobs/{jobId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const jobId = context.params.jobId;

        if (beforeData.status === afterData.status) {
            return; // No status change
        }

        const jobGiverId = afterData.jobGiver.id;
        const awardedInstallerId = afterData.awardedInstaller?.id;
        const jobTitle = afterData.title;

        // To Installer: Job Awarded
        if (afterData.status === 'Awarded' && beforeData.status !== 'Awarded' && awardedInstallerId) {
            await sendNotification(
                awardedInstallerId,
                "You've Been Awarded a Job!",
                `Congratulations! You have been awarded the job: "${jobTitle}". You have 24 hours to accept.`,
                `/dashboard/jobs/${jobId}`
            );
        }

        // To Job Giver: Job Accepted
        if (afterData.status === 'In Progress' && beforeData.status === 'Awarded') {
            if (afterData.awardedInstaller && typeof afterData.awardedInstaller.get === 'function') {
                const installerDoc = await afterData.awardedInstaller.get();
                const installerName = installerDoc.data()?.name || "The installer";
                await sendNotification(
                    jobGiverId,
                    "Job Accepted!",
                    `${installerName} has accepted the job: "${jobTitle}". Work can now begin.`,
                    `/dashboard/jobs/${jobId}`
                );
            }
        }

        // --- Logic for Declined or Missed Job Offer ---
        if ((afterData.status === 'Open for Bidding' || afterData.status === 'Bidding Closed') && beforeData.status === 'Awarded') {
            const declinedInstallerRef = beforeData.awardedInstaller;
            if (!declinedInstallerRef || typeof declinedInstallerRef.get !== 'function') return;

            const installerDoc = await declinedInstallerRef.get();
            const installerName = installerDoc.data()?.name || "The installer";
            
            // Notify Job Giver
            await sendNotification(
                jobGiverId,
                "Job Offer Declined",
                `${installerName} has declined or missed the offer for job: "${jobTitle}". You can now award it to another installer.`,
                `/dashboard/jobs/${jobId}`
            );
            
            // Apply reputation penalty
            const settingsRef = admin.firestore().collection('settings').doc('platform');
            const settingsSnap = await settingsRef.get();
            const penalty = settingsSnap.data()?.penaltyForDeclinedJob || -15; // Default to -15 if not set

            if (penalty < 0) {
                 try {
                    await admin.firestore().runTransaction(async (transaction) => {
                        const installerProfileDoc = await transaction.get(declinedInstallerRef);
                        if (!installerProfileDoc.exists) return;
                        const currentPoints = installerProfileDoc.data()?.installerProfile?.points || 0;
                        transaction.update(declinedInstallerRef, { 'installerProfile.points': currentPoints + penalty });
                    });
                     console.log(`Applied penalty of ${penalty} points to installer ${declinedInstallerRef.id} for declining job ${jobId}.`);
                     await sendNotification(
                        declinedInstallerRef.id,
                        "Reputation Penalty Applied",
                        `You received a ${penalty} point penalty for declining or not responding to the job offer: "${jobTitle}".`,
                        `/dashboard/profile`
                    );
                } catch (error) {
                    console.error("Error applying reputation penalty for decline:", error);
                }
            }
        }

        // To Job Giver: Job Completed
        if (afterData.status === 'Completed' && beforeData.status !== 'Completed') {
            await sendNotification(
                jobGiverId,
                "Job Marked as Complete",
                `The job "${jobTitle}" has been marked as complete by the installer. Please provide a rating.`,
                `/dashboard/jobs/${jobId}`
            );
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
 * when a job status changes to "Completed".
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

            const settingsRef = admin.firestore().collection('settings').doc('platform');
            const settingsSnap = await settingsRef.get();
            const settings = settingsSnap.data() || {};
            
            // Default reputation values if not set
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
                    const newPoints = currentPoints + pointsEarned;
                    
                    let newTier = installerData.installerProfile.tier || 'Bronze';
                    if (newPoints >= platinumTierPoints) {
                        newTier = 'Platinum';
                    } else if (newPoints >= goldTierPoints) {
                        newTier = 'Gold';
                    } else if (newPoints >= silverTierPoints) {
                        newTier = 'Silver';
                    }

                    const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                    
                    // Update reputation history
                    const history = installerData.installerProfile.reputationHistory || [];
                    const monthIndex = history.findIndex((h: {month:string}) => h.month === monthYear);
                    if (monthIndex > -1) {
                        history[monthIndex].points = newPoints;
                    } else {
                        history.push({ month: monthYear, points: newPoints });
                    }
                    
                    // Limit history to last 12 months for performance
                    if (history.length > 12) {
                        history.shift();
                    }

                    transaction.update(installerRef, {
                        'installerProfile.points': newPoints,
                        'installerProfile.tier': newTier,
                        'installerProfile.reputationHistory': history,
                        'installerProfile.reviews': admin.firestore.FieldValue.increment(1)
                    });
                });
                console.log(`Successfully updated reputation for installer ${installerRef.id}. Awarded ${pointsEarned} points.`);
                
                await sendNotification(
                    installerRef.id,
                    "Reputation Updated!",
                    `You earned ${pointsEarned} points for completing the job: "${afterData.title}"`,
                    `/dashboard/profile`
                );
            } catch (error) {
                console.error("Error updating reputation:", error);
            }
        }
    });


    


