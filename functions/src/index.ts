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
            
            const installerDoc = await newBid.installer.get();
            const installerName = installerDoc.data()?.name || "An installer";

            await sendNotification(
                jobGiverId,
                "New Bid on Your Job!",
                `${installerName} placed a bid of ₹${newBid.amount} on your job: "${afterData.title}"`,
                `/dashboard/jobs/${context.params.jobId}`
            );
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
