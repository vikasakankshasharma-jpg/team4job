
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/server-init';

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
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

        await db.collection('users').doc(uid).set({
            payouts: {
                beneficiaryId: `TEST_BENE_${Date.now()}`,
                accountHolderName: 'Test Installer',
                accountNumberMasked: '**** 1234',
                ifsc: 'TEST0001234'
            }
        }, { merge: true });

        console.log(`[E2E Setup] Seeded payouts for ${email} (${uid})`);
        return NextResponse.json({ success: true, uid });

    } catch (error: any) {
        console.error('[E2E Setup] Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
