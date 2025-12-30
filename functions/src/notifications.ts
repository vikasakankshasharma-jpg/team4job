

// ZERO COST MIGRATION: These functions are DISABLED in favor of Client-Side Vercel Proxy.
// See src/app/api/notifications/send/route.ts and src/lib/notifications.ts

// import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";

// const db = admin.firestore();

// ... (Rest of code commented out or removed for clarity)
// To re-enable, uncomment and deploy to Blaze plan.

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
        const bid = snap.data();
        const jobId = bid.jobId;

        // Fetch Job to get Job Giver ID
        const jobSnap = await db.collection("jobs").doc(jobId).get();
        if (!jobSnap.exists) return;
        const job = jobSnap.data();

        // Fetch Job Giver User
        // Note: job.jobGiver might be a reference or ID string depending on implementation.
        // Based on previous code, job.jobGiver is a Doc Ref, but job.jobGiverId is usually stored.
        // We safely check both.
        let jobGiverId = job?.jobGiverId;
        if (!jobGiverId && job?.jobGiver) {
            jobGiverId = job.jobGiver.id;
        }

        if (!jobGiverId) {
            console.error("No Job Giver ID found for job", jobId);
            return;
        }

        const userSnap = await db.collection("users").doc(jobGiverId).get();
        if (!userSnap.exists) return;
        const jobGiver = userSnap.data();

        if (jobGiver && jobGiver.email) {
            await sendEmail(
                jobGiver.email,
                "New Bid Received: " + (job?.title || "Your Job"),
                `You have received a new bid of ₹${bid.amount} for your job. Log in to view details.`,
                `<p>You have received a new bid of <strong>₹${bid.amount}</strong> for your job.</p><p><a href="https://your-domain.com/dashboard/jobs/${jobId}">View Bid</a></p>`
            );
        }
    });

export const emailOnJobUpdated = functions.firestore
    .document("jobs/{jobId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Case 1: Job Funded (Pending Funding -> In Progress)
        // Or specific status change logic you use.
        // Assuming 'Pending Funding' -> 'Pending Confirmation' or similar flow.
        // Based on acceptance flow: 'Pending Funding' is set when Installer accepts.
        // Then Admin/Gateway funds it -> status becomes 'In Progress'?
        // Let's assume 'In Progress' is the signal for "Start Work".

        if (before.status !== "In Progress" && after.status === "In Progress") {
            // Notify Installer to start work
            const installerRef = after.awardedInstaller; // Doc Ref
            if (!installerRef) return;

            const installerSnap = await installerRef.get();
            if (!installerSnap.exists) return;
            const installer = installerSnap.data();

            if (installer && installer.email) {
                await sendEmail(
                    installer.email,
                    "Action Required: Start Work",
                    `Funds have been secured for job: ${after.title}. You can now begin work.`,
                    `<p>Funds have been secured for job: <strong>${after.title}</strong>.</p><p>Please coordinate with the client and begin work.</p>`
                );
            }
        }

        // Case 2: Payment Released (Completed)
        if (before.status !== "Completed" && after.status === "Completed") {
            const installerRef = after.awardedInstaller;
            if (!installerRef) return;

            const installerSnap = await installerRef.get();
            if (!installerSnap.exists) return;
            const installer = installerSnap.data();

            if (installer && installer.email) {
                await sendEmail(
                    installer.email,
                    "Payment Released!",
                    `Great news! The payment for job: ${after.title} has been released to your account.`,
                    `<p>Great news! The payment for job: <strong>${after.title}</strong> has been released to your account.</p><p>It may take 1-2 business days to reflect in your bank.</p>`
                );
            }
        }
    });
