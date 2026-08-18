// app/api/e2e/setup-Professional/route.ts - REFACTORED to use infrastructure

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';


export const dynamic = 'force-dynamic';

const isE2eAllowed = () => {
    return process.env.NEXT_PUBLIC_E2E === 'true' && process.env.ALLOW_E2E_SEED === 'true';
};

/**
 * E2E Test Helper: Setup Professional payout details for testing
 * ✅ REFACTORED: Uses infrastructure logger and Firebase
 */
export async function POST(req: NextRequest) {
    if (!isE2eAllowed()) {
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
                        accountHolderName: 'Test Professional',
                        accountNumberMasked: '**** 1234',
                        ifsc: 'TEST0001234',
                    },
                },
                { merge: true }
            );



        return NextResponse.json({ success: true, uid });
    } catch (error: any) {

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
