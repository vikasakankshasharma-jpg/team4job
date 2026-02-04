"use server";

import { userService } from "@/domains/users/user.service";
import { getAdminDb } from "@/infrastructure/firebase/admin";
import { Transaction } from "@/lib/types";
import { JobGiverStats, InstallerStats } from "@/domains/jobs/job.types";
import { jobService } from "@/domains/jobs/job.service";

export async function fetchJobGiverStats(userId: string): Promise<JobGiverStats> {
    const db = getAdminDb();
    const jobGiverJobsSnapshot = await db.collection('jobs')
        .where('jobGiverId', '==', userId)
        .get();

    const stats = {
        activeJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        totalBids: 0,
        openDisputes: 0
    };

    jobGiverJobsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'in_progress' || data.status === 'open' || data.status === 'Open for Bidding') stats.activeJobs++;
        if (data.status === 'completed') stats.completedJobs++;
        if (data.status === 'cancelled') stats.cancelledJobs++;
    });

    return stats;
}

export async function fetchInstallerStats(userId: string): Promise<InstallerStats> {
    const db = getAdminDb();

    // Parallel queries for efficiency
    const [installerJobsSnapshot, openJobsSnapshot, myBidsSnapshot] = await Promise.all([
        db.collection('jobs').where('installerId', '==', userId).get(),
        db.collection('jobs').where('status', '==', 'Open for Bidding').count().get(),
        db.collection('bids').where('installerId', '==', userId).count().get()
    ]);

    const stats = {
        projectedEarnings: 0,
        totalEarnings: 0,
        activeJobs: 0,
        completedJobs: 0,
        openJobs: openJobsSnapshot.data().count,
        myBids: myBidsSnapshot.data().count,
        jobsWon: 0
    };

    installerJobsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'in_progress' || data.status === 'In Progress') stats.activeJobs++;
        if (data.status === 'completed' || data.status === 'Completed') {
            stats.completedJobs++;
            stats.totalEarnings += (data.finalAmount || 0); // Need to check if finalAmount exists or calculate from transactions
        }
    });

    // Also check transactions for totalEarnings to be more accurate if needed, 
    // but for now relying on Job Data or we can aggregate from transactions helper.
    // Let's stick to the previous pattern for active/completed counts.
    stats.jobsWon = stats.activeJobs + stats.completedJobs;

    return stats;
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
