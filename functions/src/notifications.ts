import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

const db = admin.firestore();

/**
 * Sends a push notification to a user.
 * @param userId The UID of the user to notify.
 * @param title The title of the notification.
 * @param body The body of the notification.
 * @param link Optional deep link for the notification.
 */
export async function sendPushNotification(
  userId: string, title: string, body: string, link?: string
) {
  try {
    if (!userId) {
      return;
    }

    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
      return;
    }

    const payload: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      webpush: {
        fcmOptions: {
          link: link || "https://team4job.com/dashboard",
        },
      },
      tokens: userData.fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    
    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered") {
            tokensToRemove.push(userData.fcmTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await db.collection("users").doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
        });
      }
    }
  } catch (error) {
    functions.logger.error("Push Notification Error:", error);
  }
}

/**
 * Sends an email using Brevo SMTP.
 */
export async function sendBrevoEmail(to: string, subject: string, text: string, html: string) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        functions.logger.warn("BREVO_API_KEY is missing. Email skipped.");
        return;
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": apiKey,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                sender: { name: "Team4Job Alerts", email: "noreply@team4job.com" },
                to: [{ email: to }],
                subject: subject,
                textContent: text,
                htmlContent: html
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            functions.logger.error("Brevo API Error:", errorData);
        }
    } catch (error) {
        functions.logger.error("Email Sending Error:", error);
    }
}
