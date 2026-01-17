'use server';

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

// Zero-Cost Migration:
// Using /api/notifications/send (Brevo Proxy).
// Legacy Cloud Functions disabled to save costs.

// Enabled for Phase 10: Saved Search Alerts
export * from "./alerts";
