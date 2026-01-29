'use server';

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { userService } from '@/domains/users/user.service';
import { Transaction } from '@/lib/types';

/**
 * Server Action to fetch transaction history
 */
export async function getTransactionHistoryAction(userId: string) {
    try {
        const user = await userService.getProfile(userId);
        const isAdmin = user.role === 'Admin' || user.role === 'Support Team';

        const db = getAdminDb();
        let transactions: Transaction[] = [];

        if (isAdmin) {
            const snapshot = await db.collection('transactions').get();
            transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        } else {
            const [payerSnap, payeeSnap] = await Promise.all([
                db.collection('transactions').where('payerId', '==', userId).get(),
                db.collection('transactions').where('payeeId', '==', userId).get()
            ]);

            const txMap = new Map<string, Transaction>();
            payerSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
            payeeSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
            transactions = Array.from(txMap.values());
        }

        // Return transactions sorted by date
        const sorted = transactions.sort((a, b) => {
            const getTime = (date: any) => {
                if (!date) return 0;
                if (typeof date.toDate === 'function') return date.toDate().getTime();
                if (date instanceof Date) return date.getTime();
                return new Date(date).getTime();
            };
            return getTime(b.createdAt) - getTime(a.createdAt);
        });

        // We return raw data, client handles remaining formatting
        return { success: true, transactions: JSON.parse(JSON.stringify(sorted)) };
    } catch (error: any) {
        console.error('getTransactionHistoryAction error:', error);
        return { success: false, error: error.message || 'Failed to fetch history' };
    }
}
