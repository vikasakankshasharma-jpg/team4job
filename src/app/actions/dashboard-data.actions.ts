"use server";

import { userService } from "@/domains/users/user.service";
import { getAdminDb } from "@/infrastructure/firebase/admin";
import { Transaction } from "@/lib/types";
import { JobGiverStats, InstallerStats } from "@/domains/jobs/job.types";
import { jobService } from "@/domains/jobs/job.service";
import { userRepository } from "@/domains/users/user.repository";

export async function fetchJobGiverStats(userId: string): Promise<JobGiverStats> {
    const stats = await jobService.getStatsForJobGiver(userId);

    // Map JobStats (domain) to JobGiverStats (UI)
    // JobStats: { totalJobs, openJobs, inProgressJobs, completedJobs, cancelledJobs, totalBids }
    // JobGiverStats: { activeJobs, completedJobs, cancelledJobs, totalBids, openDisputes }

    return {
        activeJobs: stats.openJobs, // Using 'openJobs' which we calculated as all active/in-progress statuses
        completedJobs: stats.completedJobs,
        cancelledJobs: stats.cancelledJobs,
        totalBids: stats.totalBids,
        openDisputes: 0 // Placeholder, or fetch from dispute service if critical
    };
}

export async function fetchInstallerStats(userId: string): Promise<InstallerStats> {
    const stats = await jobService.getStatsForInstaller(userId);

    // Calculate earnings from transactions if needed (kept separate or integrated?)
    // The previous implementation calculated active/completed from fetching ALL jobs. 
    // We need to keep that logic or rely on the repository's count.

    // Repository getStatsForInstaller returns:
    // { openJobs (market), myBids, jobsWon, projectedEarnings: 0, totalEarnings: 0 }

    // We need "activeJobs" (In Progress) and "completedJobs" for the UI?
    // InstallerStats interface: 
    // export interface InstallerStats {
    //    projectedEarnings: number;
    //    totalEarnings: number;
    //    activeJobs: number;
    //    completedJobs: number;
    //    openJobs: number;
    //    myBids: number;
    //    jobsWon: number;

    // Fetch user for pre-aggregated earnings (maintained by PaymentService.releaseFunds)
    const user = await userRepository.fetchById(userId);
    const db = getAdminDb();

    const [activeSnap, completedSnap] = await Promise.all([
        db.collection('jobs')
            .where('awardedInstallerId', '==', userId)
            .where('status', 'in', ['in_progress', 'In Progress', 'Pending Funding', 'Pending Confirmation', 'work_submitted', 'Work Submitted'])
            .count().get(),
        db.collection('jobs')
            .where('awardedInstallerId', '==', userId)
            .where('status', 'in', ['Completed', 'completed'])
            .count().get()
    ]);

    return {
        ...stats,
        activeJobs: activeSnap.data().count,
        completedJobs: completedSnap.data().count,
        projectedEarnings: (user as any)?.projectedEarnings || 0,
        totalEarnings: (user as any)?.totalEarnings || 0
    };
}

export async function fetchTransactions(userId: string, limitCount = 50): Promise<Transaction[]> {
    const db = getAdminDb();
    const transactionsSnapshot = await db.collection('transactions')
        .where('payeeId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();

    return transactionsSnapshot.docs.map(doc => {
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
        } as unknown as Transaction;
    });
}

export async function fetchActivities(userId: string): Promise<any[]> {
    const db = getAdminDb();
    const activitiesSnapshot = await db.collection('activities')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

    return activitiesSnapshot.docs.map(doc => {
        const data = doc.data();
        const mapDate = (d: any) => d?.toDate?.() || d;
        return {
            id: doc.id,
            ...data,
            timestamp: mapDate(data.timestamp),
        };
    });
}
