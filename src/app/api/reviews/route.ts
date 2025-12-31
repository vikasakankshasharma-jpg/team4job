
import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase/server-init';
import { Job, User } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { jobId, rating, comment } = await req.json();

        if (!jobId || !rating) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const jobRef = db.collection('jobs').doc(jobId);
        const jobSnap = await jobRef.get();
        if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        const job = jobSnap.data() as Job;

        if (job.status !== 'Completed') {
            return NextResponse.json({ error: 'Can only review completed jobs.' }, { status: 400 });
        }

        const jobGiverId = typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id;
        const installerId = typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id;
        const role = userId === jobGiverId ? 'Job Giver' : (userId === installerId ? 'Installer' : null);

        if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Save Review
        const targetUserId = role === 'Job Giver' ? installerId : jobGiverId;
        if (!targetUserId) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

        await db.collection('reviews').add({
            jobId,
            reviewerId: userId,
            targetUserId,
            rating,
            comment,
            createdAt: new Date(),
            role // Reviewer Role
        });

        // Update Target User Profile Stats
        // Atomically increment count and rating sum? No, average needs recalc.
        // Simplified: Just store review count and rating sum.
        // Actually, user profile has 'installerProfile.rating'.
        // We need to fetch current stats and update. 
        // Or simpler for MVP: Just add review to collection. Calculations can be done on read or scheduled task.
        // Let's do a basic increment update.

        const targetRef = db.collection('users').doc(targetUserId);

        // If reviewing installer
        if (role === 'Job Giver') {
            // Need transaction to update average carefully, but increment is safer for concurrency.
            // Let's just update 'reviews' count. Rating average ideally needs recalculation.
            await targetRef.update({
                'installerProfile.reviews': FieldValue.increment(1),
                // 'installerProfile.rating': ... (Complex calc)
            });
            // Update Job to mark reviewed
            await jobRef.update({ isReviewedByGiver: true });
        } else {
            await jobRef.update({ isReviewedByInstaller: true });
        }

        return NextResponse.json({ success: true, message: 'Review submitted.' });

    } catch (error: any) {
        console.error("Review API Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
