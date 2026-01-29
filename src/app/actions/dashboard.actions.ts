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

        // 1. Fetch recent transactions
        const transactionsSnapshot = await db.collection('transactions')
            .where('payeeId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const transactions = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as any)?.toDate?.() || data.createdAt,
                updatedAt: (data.updatedAt as any)?.toDate?.() || data.updatedAt,
                releasedAt: (data.releasedAt as any)?.toDate?.() || data.releasedAt,
                processedAt: (data.processedAt as any)?.toDate?.() || data.processedAt,
                fundedAt: (data.fundedAt as any)?.toDate?.() || data.fundedAt,
                failedAt: (data.failedAt as any)?.toDate?.() || data.failedAt,
                refundedAt: (data.refundedAt as any)?.toDate?.() || data.refundedAt,
            };
        }) as unknown as Transaction[];

        // 2. Aggregate Installer Stats
        const installerJobsSnapshot = await db.collection('jobs')
            .where('installerId', '==', userId)
            .get();

        const installerStats = {
            projectedEarnings: 0,
            totalEarnings: 0,
            activeJobs: 0,
            completedJobs: 0,
            openJobs: 0,
            myBids: 0,
            jobsWon: 0
        };

        installerJobsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'in_progress') installerStats.activeJobs++;
            if (data.status === 'completed') {
                installerStats.completedJobs++;
                installerStats.totalEarnings += (data.finalAmount || 0);
            }
        });

        // 3. Aggregate Job Giver Stats
        const jobGiverJobsSnapshot = await db.collection('jobs')
            .where('jobGiverId', '==', userId)
            .get();

        const jobGiverStats = {
            activeJobs: 0,
            completedJobs: 0,
            cancelledJobs: 0,
            totalBids: 0,
            openDisputes: 0
        };

        jobGiverJobsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'in_progress') jobGiverStats.activeJobs++;
            if (data.status === 'completed') jobGiverStats.completedJobs++;
            if (data.status === 'cancelled') jobGiverStats.cancelledJobs++;
        });

        return {
            success: true,
            data: {
                transactions,
                installerStats,
                jobGiverStats
            }
        };

    } catch (error: any) {
        logger.error('Error fetching dashboard stats', error);
        return {
            success: false,
            error: error.message
        };
    }
}
