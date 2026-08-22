"use server";

import { jobService } from "@/domains/jobs/job.service";
import { paymentService } from "@/domains/payments/payment.service";
import { userService } from "@/domains/users/user.service";
import { logger } from "@/infrastructure/logger";
import { getAdminDb } from "@/infrastructure/firebase/admin";
import { Transaction } from "@/lib/types";

export async function getDashboardStatsAction(userId: string) {
    try {
        const db = getAdminDb();
        const startTime = Date.now();

        const timeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Dashboard data fetch timed out')), 15000)
        ); // Increased from 5s to 15s for stability during audits

        const [transactionsSnapshot, ProfessionalStats, ClientStats, quickMetrics] = await Promise.race([
            Promise.all([
                db.collection('transactions')
                    .where('payeeId', '==', userId)
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get()
                    .then(snap => { return snap; }),
                jobService.getStatsForProfessional(userId)
                    .then(stats => { return stats; }),
                jobService.getStatsForClient(userId)
                    .then(stats => { return stats; }),
                jobService.getQuickMetrics(userId)
                    .then(metrics => { return metrics; })
            ]),
            timeout
        ]);
        const transactions = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const mapDate = (d: any) => {
                if (!d) return null;
                const date = d?.toDate?.() || (d instanceof Date ? d : new Date(d));
                return date instanceof Date && !isNaN(date.getTime()) ? date.toISOString() : null;
            };
            return {
                id: doc.id,
                ...data,
                createdAt: mapDate(data.createdAt),
                updatedAt: mapDate(data.updatedAt),
                releasedAt: mapDate(data.releasedAt),
                processedAt: mapDate(data.processedAt),
                fundedAt: mapDate(data.fundedAt),
                failedAt: mapDate(data.failedAt),
                refundedAt: mapDate(data.refundedAt),
            };
        }) as unknown as Transaction[];

        // Serialize to strip all non-serializable Firestore objects (Timestamps, References, etc.)
        return JSON.parse(JSON.stringify({
            success: true,
            data: {
                transactions,
                ProfessionalStats,
                ClientStats,
                quickMetrics
            }
        }));

    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}



