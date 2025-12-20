
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server-init';
import { Job, User } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const { jobId, userId } = await req.json();

        if (!jobId) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const job = { id: jobSnap.id, ...jobSnap.data() } as Job;

        // --- PRIVACY & SECURITY LAYER ---

        // Determine user role relative to this job
        const isJobGiver = (job.jobGiver as any).id === userId || job.jobGiver === userId; // Handle ref vs string
        const isAwardedInstaller = job.awardedInstaller && ((job.awardedInstaller as any).id === userId || job.awardedInstaller === userId);

        // Ideally we check Admin role too, but we need to fetch the User doc for that.
        // For efficiency, let's assume if you are not JG or Awarded, you are "Public/Bidder".

        let isAdmin = false;
        if (userId) {
            const userSnap = await db.collection('users').doc(userId).get();
            const userData = userSnap.data() as User;
            isAdmin = (userData?.roles || []).includes('Admin') || (userData?.roles || []).includes('Support Team');
        }

        const hasFullAccess = isJobGiver || isAwardedInstaller || isAdmin;

        // Clone to avoid mutating cache (if any)
        const safeJob = { ...job };

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
