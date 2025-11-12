
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

/**
 * Handles scheduled cleanup of jobs that are stuck in "Pending Funding".
 * Runs every 6 hours.
 */
export const handleUnfundedJobs = functions.pubsub.schedule('every 6 hours').onRun(async (context) => {
    console.log('Running scheduled function to handle unfunded jobs...');
    const now = admin.firestore.Timestamp.now();
    
    // Set deadline to 48 hours ago
    const fortyEightHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 48 * 60 * 60 * 1000);

    const q = admin.firestore().collection('jobs')
        .where('status', '==', 'Pending Funding')
        .where('fundingDeadline', '<=', fortyEightHoursAgo);

    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log('No stale unfunded jobs found.');
        return null;
    }

    const batch = admin.firestore().batch();
    const notificationPromises: Promise<void>[] = [];

    snapshot.docs.forEach(doc => {
        const job = doc.data();
        console.log(`Cancelling job ${doc.id} due to funding timeout.`);
        batch.update(doc.ref, { status: 'Cancelled' });

        // Notify Job Giver
        notificationPromises.push(sendNotification(
            job.jobGiver.id,
            'Job Cancelled',
            `Your job "${job.title}" was automatically cancelled because it was not funded within 48 hours of acceptance.`,
            `/dashboard/jobs/${doc.id}`
        ));

        // Notify Installer
        notificationPromises.push(sendNotification(
            job.awardedInstaller.id,
            'Job Cancelled',
            `Job "${job.title}" was cancelled as the Job Giver did not complete payment. You are now free to bid on other jobs.`,
            `/dashboard/jobs/${doc.id}`
        ));
    });

    await batch.commit();
    await Promise.all(notificationPromises);

    console.log(`Cancelled ${snapshot.size} unfunded jobs.`);
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
        if (beforeData.dateChangeProposal && beforeData.dateChangeProposal.status === 'pending' && (!afterData.dateChangeProposal || afterData.dateChangeProposal.status !== 'pending')) {
            const wasAccepted = afterData.jobStartDate !== beforeData.jobStartDate;
            const proposerId = beforeData.dateChangeProposal.proposedBy === 'Job Giver' ? afterData.jobGiver.id : afterData.awardedInstaller.id;
            
            await sendNotification(
                proposerId,
                `Date Change ${wasAccepted ? 'Accepted' : 'Rejected'}`,
                `Your proposed date change for job "${afterData.title}" was ${wasAccepted ? 'accepted' : 'rejected'}.`,
                `/dashboard/jobs/${jobId}`
            );
        }
    });

/**
 * Handles scheduled cleanup of jobs where the award offer has expired.
 * Runs every hour. This function is now strategy-aware.
 */
export const handleExpiredAwards = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
    console.log('Running scheduled function to handle expired job awards...');
    const now = admin.firestore.Timestamp.now();

    const q = admin.firestore().collection('jobs')
        .where('status', '==', 'Awarded')
        .where('acceptanceDeadline', '<=', now);

    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log('No expired awards found.');
        return null;
    }

    for (const doc of snapshot.docs) {
        const job = doc.data();
        const remainingInstallers = (job.selectedInstallers || [])
            .filter((s: { installerId: string }) => s.installerId !== job.awardedInstaller?.id)
            .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank);
        
        const isSequential = remainingInstallers.some((s: { rank: number }) => s.rank > 1);
        
        if (isSequential && remainingInstallers.length > 0) {
            // --- Sequential Strategy: Offer to next in line ---
            const nextInstaller = remainingInstallers[0];
            const newAcceptanceDeadline = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
            
            console.log(`Job ${doc.id}: Sequential offer expired for ${job.awardedInstaller?.id}. Offering to next installer: ${nextInstaller.installerId}`);

            await doc.ref.update({
                awardedInstaller: admin.firestore().doc(`users/${nextInstaller.installerId}`),
                acceptanceDeadline: newAcceptanceDeadline
            });

            // Notify the next installer
            await sendNotification(
                nextInstaller.installerId,
                'You Have a New Job Offer!',
                `You have received an offer for the job: "${job.title}". Please respond within 24 hours.`,
                `/dashboard/jobs/${doc.id}`
            );

        } else {
            // --- Simultaneous Strategy or End of Sequential List ---
            console.log(`Job ${doc.id}: All offers expired or simultaneous offer timed out. Reverting to 'Bidding Closed'.`);

            await doc.ref.update({
                status: 'Bidding Closed',
                awardedInstaller: admin.firestore.FieldValue.delete(),
                acceptanceDeadline: admin.firestore.FieldValue.delete(),
                selectedInstallers: [] // Clear selections
            });

            // Notify Job Giver that the offer(s) expired
            await sendNotification(
                job.jobGiver.id,
                'Offer(s) Expired',
                `Your offer(s) for job "${job.title}" expired without being accepted. You can now award it to another installer.`,
                `/dashboard/jobs/${doc.id}`
            );
        }
    }

    console.log(`Processed ${snapshot.size} expired awards.`);
    return null;
});
