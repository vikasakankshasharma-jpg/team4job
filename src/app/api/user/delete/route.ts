import { NextResponse } from 'next/server';
import { getUserIdFromSession } from '@/lib/auth-server';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { reason } = await request.json();

        const db = getAdminDb();
        const adminAuth = getAdminAuth();

        // 1. Mark user as deactivated in Firestore
        // We don't hard delete immediately to allow for data export/recovery within a grace period
        await db.collection(COLLECTIONS.USERS).doc(userId).update({
            status: 'deactivated',
            deactivatedAt: new Date(),
            deactivationReason: reason || 'User requested deletion',
            updatedAt: new Date()
        });

        // 2. Disable the user in Firebase Auth
        await adminAuth.updateUser(userId, {
            disabled: true
        });

        // 3. Revoke sessions (optional but recommended)
        await adminAuth.revokeRefreshTokens(userId);

        console.log(`[UserDelete] User ${userId} deactivated successfully.`);

        return NextResponse.json({
            success: true,
            message: 'Your account has been deactivated. You will be logged out.'
        });

    } catch (error: any) {
        console.error('[UserDelete] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
