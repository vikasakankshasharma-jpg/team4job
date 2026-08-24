'use server';

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { userService } from '@/domains/users/user.service';

export async function getCustomerServiceHistoryAction(clientId: string) {
    try {
        const db = getAdminDb();
        
        // 1. Fetch all released transactions for this client
        const txSnapshot = await db.collection('transactions')
            .where('payerId', '==', clientId)
            .where('status', '==', 'released')
            .get();
            
        const transactions = txSnapshot.docs.map((doc: any) => doc.data());
        
        // 2. Aggregate metrics by professional (payeeId)
        const metricsMap = new Map<string, any>();
        
        transactions.forEach((tx: any) => {
            if (!tx.payeeId) return;
            
            const existing = metricsMap.get(tx.payeeId) || {
                jobsCompleted: 0,
                totalSpent: 0,
                lastHiredDate: null
            };
            
            existing.jobsCompleted += 1;
            existing.totalSpent += (tx.totalPaidByClient || tx.amount || 0); // What client paid
            
            const txDate = tx.releasedAt?.toDate ? tx.releasedAt.toDate() : new Date(tx.releasedAt);
            if (!existing.lastHiredDate || txDate > existing.lastHiredDate) {
                existing.lastHiredDate = txDate;
            }
            
            metricsMap.set(tx.payeeId, existing);
        });

        const professionalIds = Array.from(metricsMap.keys());
        
        if (professionalIds.length === 0) {
            return { success: true, history: [] };
        }
        
        // 3. Fetch Professional Profiles
        const profileMap = await userService.getPublicProfiles(professionalIds);
        
        // 4. Combine
        const history = professionalIds.map(proId => {
            const profile = profileMap.get(proId);
            const metrics = metricsMap.get(proId);
            return {
                professional: { ...profile, id: proId },
                metrics
            };
        });
        
        return { success: true, history: JSON.parse(JSON.stringify(history)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
