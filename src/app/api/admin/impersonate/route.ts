// app/api/admin/impersonate/route.ts - REFACTORED to use domain services

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/infrastructure/firebase/admin';
import { userService } from '@/domains/users/user.service';
import { logAdminAction } from '@/lib/admin-logger';


export const dynamic = 'force-dynamic';

/**
 * Create impersonation token for admin to log in as another user
 * ✅ REFACTORED: Uses user service and infrastructure logger
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Verify authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // 2. ✅ Use user service to verify admin role
        const admin = await userService.getProfile(decodedToken.uid);

        if (!admin.roles?.includes('Admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Get target user ID
        const { targetUserId } = await req.json();
        if (!targetUserId) {
            return NextResponse.json({
                error: 'Target User ID required'
            }, { status: 400 });
        }

        // 4. Mint custom token
        const customToken = await adminAuth.createCustomToken(targetUserId, {
            impersonatorId: admin.id,
        });

        // 5. Log this action
        const targetUser = await userService.getProfile(targetUserId).catch(() => null);
        await logAdminAction({
            adminId: admin.id,
            adminName: admin.name || admin.email,
            adminEmail: admin.email,
            actionType: 'IMPERSONATE_USER',
            targetType: 'user',
            targetId: targetUserId,
            targetName: targetUser ? (targetUser.name || targetUser.email) : undefined,
            details: { impersonatorId: admin.id },
            userAgent: req.headers.get('user-agent') || undefined,
        });

        return NextResponse.json({ token: customToken });

    } catch (error: any) {

        return NextResponse.json({
            error: error.message || 'Failed to create impersonation token'
        }, { status: 500 });
    }
}
