
import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase/server-init';
import { Job, User } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const { jobId } = await req.json(); // REMOVED: userId from body

        if (!jobId) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        // 1. Authorization Attempt (Optional for public, but required for Role Check)
        const authHeader = req.headers.get('Authorization');
        let authenticatedUserId: string | null = null;
        let isAdmin = false;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            try {
                const decodedToken = await adminAuth.verifyIdToken(idToken);
                authenticatedUserId = decodedToken.uid;

                // Fetch User Role
                const userSnap = await db.collection('users').doc(authenticatedUserId).get();
                const userData = userSnap.data() as User;
                isAdmin = (userData?.roles || []).includes('Admin') || (userData?.roles || []).includes('Support Team');
            } catch (e) {
                console.warn("Public job fetch: Invalid token provided, treating as anonymous.");
            }
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const job = { id: jobSnap.id, ...jobSnap.data() } as Job;

        // --- PRIVACY & SECURITY LAYER ---

        // Determine user role relative to this job using AUTHENTICATED ID
        const isJobGiver = authenticatedUserId && ((job.jobGiver as any)?.id === authenticatedUserId || (job.jobGiver as any) === authenticatedUserId);
        const isAwardedInstaller = authenticatedUserId && job.awardedInstaller && ((job.awardedInstaller as any)?.id === authenticatedUserId || (job.awardedInstaller as any) === authenticatedUserId);

        const hasFullAccess = isJobGiver || isAwardedInstaller || isAdmin;

        // Clone to avoid mutating cache (if any)
        const safeJob = { ...job };

        // --- SANITIZE REFERENCES FOR JSON SERIALIZATION ---
        const sanitizeRef = (ref: any) => {
            if (!ref) return null;
            if (typeof ref === 'string') return ref;
            return ref.id || null;
        };

        safeJob.jobGiver = sanitizeRef(safeJob.jobGiver);
        safeJob.awardedInstaller = sanitizeRef(safeJob.awardedInstaller);
        if (safeJob.bids) {
            safeJob.bids = safeJob.bids.map(bid => ({
                ...bid,
                installer: sanitizeRef(bid.installer)
            })) as any;
        }
        if (safeJob.comments) {
            safeJob.comments = safeJob.comments.map(c => ({
                ...c,
                author: sanitizeRef(c.author)
            })) as any;
        }
        if (safeJob.privateMessages) {
            safeJob.privateMessages = safeJob.privateMessages.map(m => ({
                ...m,
                author: sanitizeRef(m.author)
            })) as any;
        }

        if (!hasFullAccess) {
            // REDACT SENSITIVE DATA
            if (safeJob.address) {
                // Only keep city/pincode. Remove precise house block, street, coordinates.
                safeJob.address = {
                    cityPincode: safeJob.address.cityPincode,
                    // We explicitly leave out house, street, fullAddress, coordinates
                    house: "REDACTED",
                    street: "REDACTED",
                    fullAddress: "REDACTED",
                    landmark: "",
                    coordinates: undefined
                } as any;
            }

            // Also redact private messages if not relevant
            if (safeJob.privateMessages) {
                safeJob.privateMessages = [];
            }

            // Redact phone numbers or sensitive fields in description if any (though validateMessageContent should catch this)
        }

        return NextResponse.json({ success: true, job: safeJob });

    } catch (error: any) {
        console.error("Error fetching public job:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
