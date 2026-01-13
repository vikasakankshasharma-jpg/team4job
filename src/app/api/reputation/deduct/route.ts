
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { userId, points, reason, jobId } = await req.json();

        if (!userId || !points || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Atomic update: Deduct points + Add history entry
        const timestamp = new Date();
        const currentMonth = timestamp.toLocaleString('default', { month: 'long', year: 'numeric' });

        // We need to read the current history to update the monthly entry
        // Simplified for MVP: Just decrement the main counter and push to reputationHistory array
        // A robust system would check if month entry exists, etc.
        // For now we assume a simple 'reputationPoints' field exists on installerProfile.

        const installerProfile = userSnap.data()?.installerProfile || {};
        const currentPoints = installerProfile.reputationPoints || 0;
        const newPoints = Math.max(0, currentPoints - points);

        // Update main reputation
        await userRef.update({
            'installerProfile.reputationPoints': newPoints,
            // Also log this event (optional, but good for audit)
        });

        // If a jobId is provided, we can also update the job to enable re-application
        // BUT the client handles the 'disqualifiedInstallerIds' removal. 
        // Ideally, this API should do BOTH to be transactional.

        if (jobId) {
            const jobRef = db.collection('jobs').doc(jobId);
            await jobRef.update({
                disqualifiedInstallerIds: FieldValue.arrayRemove(userId)
            });
        }

        return NextResponse.json({ success: true, newPoints });

    } catch (error: any) {
        console.error('Error deducting points:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
