"use strict";
// ZERO COST MIGRATION: These functions are DISABLED in favor of Client-Side Vercel Proxy.
// See src/app/api/notifications/send/route.ts and src/lib/notifications.ts
// THIS FILE IS BROKEN AND UNUSED. COMMENTING OUT TO PASS BUILD.
/*
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

async function sendEmail(to: string, subject: string, text: string, html: string) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        console.warn("Missing SENDGRID_API_KEY. Email not sent.");
        return;
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: "noreply@cctvjobconnect.com", name: "CCTV Job Connect" },
            subject: subject,
            content: [
                { type: "text/plain", value: text },
                { type: "text/html", value: html },
            ],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("SendGrid Error:", err);
    }
}

export const onBidCreated = functions.firestore
    .document("bids/{bidId}")
    .onCreate(async (snap, context) => {
        // ... implementation ...
    });

export const emailOnJobUpdated = functions.firestore
    .document("jobs/{jobId}")
    .onUpdate(async (change, context) => {
        // ... implementation ...
    });
*/
//# sourceMappingURL=notifications.js.map