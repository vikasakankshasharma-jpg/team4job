// app/api/e2e/setup-installer/route.ts - REFACTORED to use infrastructure

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';

export const dynamic = 'force-dynamic';

/**
 * E2E Test Helper: Setup installer payout details for testing
 * ✅ REFACTORED: Uses infrastructure logger and Firebase
 */
export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Not allowed in production' },
            { status: 403 }
        );
    }

    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const db = getAdminDb();
        const auth = getAdminAuth();
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;

        await db
            .collection('users')
            .doc(uid)
            .set(
                {
                    payouts: {
                        beneficiaryId: `TEST_BENE_${Date.now()}`,
                        accountHolderName: 'Test Installer',
                        accountNumberMasked: '**** 1234',
                        ifsc: 'TEST0001234',
                    },
                },
                { merge: true }
            );

        logger.info('[E2E] Installer payout details seeded', { email, uid });

        return NextResponse.json({ success: true, uid });
    } catch (error: any) {
        logger.error('[E2E] Setup installer failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
