import { NextResponse } from 'next/server';
import { getUserIdFromSession } from '@/lib/auth-server';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';

export async function GET() {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getAdminDb();

        // 1. Fetch User Profile
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        // 2. Fetch User's Jobs (as Job Giver)
        const jobsSnapshot = await db.collection(COLLECTIONS.JOBS)
            .where('jobGiverId', '==', userId)
            .get();
        const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Fetch User's Bids (using Collection Group)
        const bidsSnapshot = await db.collectionGroup('bids')
            .where('installerId', '==', userId)
            .get();
        const bids = bidsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 4. Fetch User's Transactions (as Payer or Payee)
        const [payerTransactions, payeeTransactions] = await Promise.all([
            db.collection(COLLECTIONS.TRANSACTIONS).where('payerId', '==', userId).get(),
            db.collection(COLLECTIONS.TRANSACTIONS).where('payeeId', '==', userId).get()
        ]);

        const transactions = [
            ...payerTransactions.docs.map(doc => ({ id: doc.id, role: 'payer', ...doc.data() })),
            ...payeeTransactions.docs.map(doc => ({ id: doc.id, role: 'payee', ...doc.data() }))
        ];

        // 5. Fetch Notifications
        const notificationsSnapshot = await db.collection(COLLECTIONS.NOTIFICATIONS)
            .where('userId', '==', userId)
            .get();
        const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const exportData = {
            profile: userData,
            jobs,
            bids,
            transactions,
            notifications,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="dodo-data-export-${userId}.json"`
            }
        });

    } catch (error: any) {
        console.error('[UserExport] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
