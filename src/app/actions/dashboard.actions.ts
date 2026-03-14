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

        // Fetch data in parallel
        const [transactionsSnapshot, installerStats, jobGiverStats, quickMetrics] = await Promise.all([
            db.collection('transactions')
                .where('payeeId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get(),
            jobService.getStatsForInstaller(userId),
            jobService.getStatsForJobGiver(userId),
            jobService.getQuickMetrics(userId)
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
                installerStats,
                jobGiverStats,
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
