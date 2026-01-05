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
// All notification triggers have been migrated to Client-Side API calls.
// Using /api/notifications/send (Brevo Proxy).
// Legacy Cloud Functions disabled to save costs.
