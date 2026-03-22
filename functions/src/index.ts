import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as express from "express";
import * as crypto from "crypto";

admin.initializeApp();

const app = express();
const db = admin.firestore();

// Webhook Signature Verification
function verifyCashfreeSignature(rawBody: string, signature: string, timestamp: string): boolean {
  const secretKey = process.env.CASHFREE_PAYMENTS_CLIENT_SECRET;
  if (!secretKey) {
    functions.logger.error("CASHFREE_PAYMENTS_CLIENT_SECRET is missing!");
    return false;
  }
  try {
    const signatureData = `${timestamp}${rawBody}`;
    const expectedSignature = crypto.createHmac('sha256', secretKey).update(signatureData).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch { return false; }
}

app.post("/cashfree-webhook", async (req, res) => {
  const rawBody = (req as any).rawBody?.toString() || JSON.stringify(req.body);
  const signature = req.headers["x-webhook-signature"] as string;
  const timestamp = req.headers["x-webhook-timestamp"] as string;

  if (!verifyCashfreeSignature(rawBody, signature, timestamp)) {
    functions.logger.warn("Invalid Cashfree signature!");
    return res.status(401).json({ status: "unauthorized" });
  }

  const data = req.body;
  try {
    const orderId = data.data?.order?.order_id;
    const paymentStatus = data.data?.payment?.payment_status;

    if (paymentStatus === "SUCCESS" && orderId) {
      const transactionQuery = await db.collection("transactions").where("gatewayOrderId", "==", orderId).limit(1).get();
      if (!transactionQuery.empty) {
        const transDoc = transactionQuery.docs[0];
        await transDoc.ref.update({ status: "Funded", gatewayRawData: data });
        // Additional logic like job status updates can be added here
      }
    }
    return res.json({ status: "processed" });
  } catch (error) {
    functions.logger.error("Webhook Processing Error:", error);
    return res.status(500).json({ status: "error" });
  }
});

export const api = functions.https.onRequest(app);

// Alerts (Phase 10: Saved Search)
export * from "./alerts";

// Event Triggers (Bids, Messages, Completion, Verification)
export * from "./triggers";

// Cron Jobs (Cleanup, Rescue Plan)
export * from "./cron";
