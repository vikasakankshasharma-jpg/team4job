
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Helper to send email using Brevo
async function sendEmail(to: string, subject: string, text: string, html: string) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        console.warn("BREVO_API_KEY is missing. Email skipped.");
        return;
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Team4Job Alerts', email: 'noreply@cctvjobconnect.com' }, // Using existing verified sender
                to: [{ email: to }],
                subject: subject,
                textContent: text,
                htmlContent: html
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Brevo API Error:", errorData);
        }
    } catch (error) {
        console.error("Email Sending Error:", error);
    }
}

export const onJobCreated = functions.firestore
    .document("jobs/{jobId}")
    .onCreate(async (snap, context) => {
        const job = snap.data();
        if (!job) return;

        const jobId = context.params.jobId;
        console.log(`Checking saved searches for new job: ${jobId}`);

        // 1. Get all active saved searches with 'instant' frequency
        // Optimization: In a real app, query by some criteria. Here we fetch all instant alerts.
        const searchesSnap = await db.collection("saved_searches")
            .where("active", "==", true)
            .where("alertFrequency", "==", "instant")
            .get();

        if (searchesSnap.empty) return;

        const emailPromises: Promise<void>[] = [];

        for (const doc of searchesSnap.docs) {
            const search = doc.data();
            const criteria = search.criteria;

            // 2. Client-side Filtering (Filter strictly in memory)
            let match = true;

            // Min Price
            if (criteria.minPrice && (job.budget?.min || 0) < criteria.minPrice) match = false;

            // Max Price (If job min budget is strictly above user's max budget? Or overlap?)
            // Usually: Job budget range overlaps with User budget range.
            // Simple logic: If job's max < user min (handled above)
            // If user has maxPrice, and job's min > user's max, then too expensive.
            if (criteria.maxPrice && (job.budget?.min || 0) > criteria.maxPrice) match = false;

            // Skills (Must match at least one? Or all? Usually "at least one" or "subset")
            // Let's go with: If search has skills, job MUST have at least one intersecting skill.
            if (match && criteria.skills && criteria.skills.length > 0) {
                const jobSkills = (job.skills || []).map((s: string) => s.toLowerCase());
                const searchSkills = criteria.skills.map((s: string) => s.toLowerCase());
                const intersection = jobSkills.filter((s: string) => searchSkills.includes(s));
                if (intersection.length === 0) match = false;
            }

            // Location (Pincode match)
            if (match && criteria.location) {
                // Check if job location includes the search location string (pincode or city)
                if (!job.location?.toLowerCase().includes(criteria.location.toLowerCase()) &&
                    !job.fullAddress?.toLowerCase().includes(criteria.location.toLowerCase())) {
                    match = false;
                }
            }

            // Query (Keyword match in Title)
            if (match && criteria.query) {
                const q = criteria.query.toLowerCase();
                if (!job.title.toLowerCase().includes(q) && !job.description?.toLowerCase().includes(q)) {
                    match = false;
                }
            }

            if (match) {
                // 3. Fetch user email to send alert
                const userSnap = await db.collection("users").doc(search.userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    if (userData?.email) {
                        console.log(`Sending alert for search '${search.name}' to ${userData.email}`);

                        const subject = `New Job Alert: ${job.title}`;
                        const text = `A new job matching your search "${search.name}" has been posted.\n\nTitle: ${job.title}\nBudget: ₹${job.budget?.min} - ₹${job.budget?.max}\nLocation: ${job.location}\n\nView Job: https://dodo-beta.web.app/dashboard/jobs/${jobId}`;

                        const html = `
                            <div style="font-family: sans-serif; color: #333;">
                                <h2>New Job Match found!</h2>
                                <p>A new job matching your search <strong>"${search.name}"</strong> has been posted.</p>
                                <div style="border: 1px solid #eee; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin-top: 0;">${job.title}</h3>
                                    <p><strong>Budget:</strong> ₹${job.budget?.min} - ₹${job.budget?.max}</p>
                                    <p><strong>Location:</strong> ${job.location}</p>
                                    <p><strong>Skills:</strong> ${(job.skills || []).join(", ")}</p>
                                </div>
                                <a href="https://dodo-beta.web.app/dashboard/jobs/${jobId}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Job</a>
                            </div>
                        `;

                        emailPromises.push(sendEmail(userData.email, subject, text, html));
                    }
                }
            }
        }

        await Promise.all(emailPromises);
    });
