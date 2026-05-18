import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { getAdminAuth } from '@/infrastructure/firebase/admin';
import { userService } from '@/domains/users/user.service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Audit Log Integrity Verification Endpoint
 * Verifies rolling hash chain of recent admin action logs to detect tampering.
 */
export async function GET(req: NextRequest) {
    try {
        // 1. Verify authentication & authorization
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const admin = await userService.getProfile(decodedToken.uid);

        if (!admin.roles?.includes('Admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Get last 100 logs ordered by timestamp asc
        const db = getAdminDb();
        const snapshot = await db.collection('admin_action_logs')
            .orderBy('timestamp', 'asc')
            .limit(100)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({
                verified: true,
                count: 0,
                message: 'No admin action logs found to verify.'
            });
        }

        let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
        let tampered = false;
        const tamperedLogs: string[] = [];

        // Verify the rolling SHA-256 chain
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const logEntryString = JSON.stringify({
                adminId: data.adminId,
                actionType: data.actionType,
                timestamp: data.timestamp?.seconds || 0,
                targetId: data.targetId || '',
                previousHash,
            });

            const computedHash = crypto.createHash('sha256').update(logEntryString).digest('hex');

            // If a hash was recorded on write, we verify it.
            // If no hash is recorded (legacy entries), we compute the rolling chain forward.
            if (data.hash && data.hash !== computedHash) {
                tampered = true;
                tamperedLogs.push(doc.id);
            }

            previousHash = computedHash;
        }

        return NextResponse.json({
            verified: !tampered,
            count: snapshot.size,
            tamperedLogs,
            checkpointHash: previousHash,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        return NextResponse.json({
            error: error.message || 'Failed to verify log integrity'
        }, { status: 500 });
    }
}
