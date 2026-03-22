"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const express = require("express");
const crypto = require("crypto");
admin.initializeApp();
const app = express();
const db = admin.firestore();
// Webhook Signature Verification
function verifyCashfreeSignature(rawBody, signature, timestamp) {
    const secretKey = process.env.CASHFREE_PAYMENTS_CLIENT_SECRET;
    if (!secretKey) {
        functions.logger.error("CASHFREE_PAYMENTS_CLIENT_SECRET is missing!");
        return false;
    }
    try {
        const signatureData = `${timestamp}${rawBody}`;
        const expectedSignature = crypto.createHmac('sha256', secretKey).update(signatureData).digest('base64');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    catch (_a) {
        return false;
    }
}
app.post("/cashfree-webhook", async (req, res) => {
    var _a, _b, _c, _d, _e;
    const rawBody = ((_a = req.rawBody) === null || _a === void 0 ? void 0 : _a.toString()) || JSON.stringify(req.body);
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    if (!verifyCashfreeSignature(rawBody, signature, timestamp)) {
        functions.logger.warn("Invalid Cashfree signature!");
        return res.status(401).json({ status: "unauthorized" });
    }
    const data = req.body;
    try {
        const orderId = (_c = (_b = data.data) === null || _b === void 0 ? void 0 : _b.order) === null || _c === void 0 ? void 0 : _c.order_id;
        const paymentStatus = (_e = (_d = data.data) === null || _d === void 0 ? void 0 : _d.payment) === null || _e === void 0 ? void 0 : _e.payment_status;
        if (paymentStatus === "SUCCESS" && orderId) {
            const transactionQuery = await db.collection("transactions").where("gatewayOrderId", "==", orderId).limit(1).get();
            if (!transactionQuery.empty) {
                const transDoc = transactionQuery.docs[0];
                await transDoc.ref.update({ status: "Funded", gatewayRawData: data });
                // Additional logic like job status updates can be added here
            }
        }
        return res.json({ status: "processed" });
    }
    catch (error) {
        functions.logger.error("Webhook Processing Error:", error);
        return res.status(500).json({ status: "error" });
    }
});
exports.api = functions.https.onRequest(app);
// Alerts (Phase 10: Saved Search)
__exportStar(require("./alerts"), exports);
// Event Triggers (Bids, Messages, Completion, Verification)
__exportStar(require("./triggers"), exports);
// Cron Jobs (Cleanup, Rescue Plan)
__exportStar(require("./cron"), exports);
//# sourceMappingURL=index.js.map