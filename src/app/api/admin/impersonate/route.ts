
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/server-init';
import { User } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    try {
        // 1. Auth Check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // 2. Verify Admin Role
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) throw new Error("Admin not found");

        const userData = userDoc.data() as User;
        if (!userData.roles.includes('Admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Get Target User ID
        const { targetUserId } = await req.json();
        if (!targetUserId) {
            return NextResponse.json({ error: 'Target User ID required' }, { status: 400 });
        }

        // 4. Mint Custom Token
        // We add a claim 'impersonatedBy' to track this session if needed, 
        // but standard custom token is enough for login.
        const customToken = await adminAuth.createCustomToken(targetUserId, {
            impersonatorId: userData.id
        });

        // 5. Log this action
        const { logAdminAction } = await import('@/lib/admin-logger');
        await logAdminAction({
            adminId: userData.id,
            adminName: userData.name,
            adminEmail: userData.email,
            actionType: 'IMPERSONATE_USER',
            targetType: 'user',
            targetId: targetUserId,
            targetName: 'Target User', // Could fetch exact name if needed, but ID is sufficient for audit
            details: { timestamp: new Date().toISOString() }
        });

        return NextResponse.json({ token: customToken });

    } catch (error: any) {
        console.error('Impersonation error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
