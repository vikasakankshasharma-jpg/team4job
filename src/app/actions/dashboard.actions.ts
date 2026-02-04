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
        const [transactionsSnapshot, installerJobsSnapshot, jobGiverJobsSnapshot, quickMetrics] = await Promise.all([
            db.collection('transactions')
                .where('payeeId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get(),
            db.collection('jobs')
                .where('installerId', '==', userId)
                .get(),
            db.collection('jobs')
                .where('jobGiverId', '==', userId)
                .get(),
            jobService.getQuickMetrics(userId)
        ]);

        const transactions = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const mapDate = (d: any) => d?.toDate?.() || d;
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
                jobGiverStats,
                quickMetrics
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
