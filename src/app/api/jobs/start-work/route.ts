
import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase/server-init';
import { Job } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

import { startWorkSchema } from '@/lib/validations/jobs';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = startWorkSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { jobId, otp, userId } = validation.data;

        // 1. Authorization

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data() as Job;

        // Verify OTP
        // Check both startOtp (string) or maybe number? We stored string.
        if (!job.startOtp || job.startOtp !== otp.toString()) {
            return NextResponse.json({ error: 'Invalid or incorrect Start Code.' }, { status: 400 });
        }

        // Verify Status
        if (job.status !== 'In Progress') {
            return NextResponse.json({ error: 'Job is not In Progress.' }, { status: 400 });
        }

        // Update Job
        await jobRef.update({
            workStartedAt: FieldValue.serverTimestamp(),
            // We can keep startOtp for audit or delete it. Let's keep it but `workStartedAt` is the truth.
            // Actually, deleting it prevents re-use if we had retry logic? No, idempotent is better.
            // Let's just set the timestamp.
        });

        // Notify Job Giver?
        // (Optional: "Installer has started work")

        return NextResponse.json({ success: true, message: 'Work marked as started.' });

    } catch (error: any) {
        console.error('Error starting work:', error);
        return NextResponse.json({ error: error.message || 'Failed to start work.' }, { status: 500 });
    }
}
