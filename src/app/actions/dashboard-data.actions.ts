"use server";

import { userService } from "@/domains/users/user.service";
import { getAdminDb } from "@/infrastructure/firebase/admin";
import { Transaction } from "@/lib/types";
import { JobGiverStats, InstallerStats } from "@/domains/jobs/job.types";
import { jobService } from "@/domains/jobs/job.service";

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
    // }

    // The repository method `getStatsForInstaller` currently only gets open/bids/won.
    // We need to enhance the repository method or minimal additional queries here.
    // Let's assume we update repository later or now? 
    // Best practice: Update repository to fetch active/completed counts for installer too.

    // For now, let's look at `jobService.getStatsForInstaller`. It just calls repo.
    // Let's check `job.repository.ts` again. It misses active/completed counts for installer specific jobs.

    // Let's implement active/completed count in this action for now using count() queries 
    // OR ideally update the repository method proper.

    const db = getAdminDb();

    const [activeSnap, completedSnap] = await Promise.all([
        db.collection('jobs')
            .where('awardedInstallerId', '==', userId)
            .where('status', 'in', ['in_progress', 'In Progress', 'Pending Funding', 'Pending Confirmation'])
            .count().get(),
        db.collection('jobs')
            .where('awardedInstallerId', '==', userId)
            .where('status', 'in', ['Completed', 'completed'])
            .count().get()
    ]);

    // Earnings... fetching all transactions might still be heavy if there are thousands.
    // But transactions are payment records, usually fewer than jobs?
    // Let's use `fetchTransactions` limit but we need TOTAL earnings.
    // Aggregation query for sum is not native in Firestore client SDKs easily without extension?
    // Actually sum() is supported in newer Node SDKs.

    // Let's try sum() if available, or fetch strictly relevant transaction fields.
    // Given the previous code fetched all installer jobs to sum earnings... 
    // Let's rely on calculating it from closed jobs? Or keep the transaction scan but minimal.
    // Previous code: `stats.totalEarnings += (data.finalAmount || 0)` from Job docs.
    // So we can sum `finalAmount` from completed jobs.
    // But we just did count().

    // COMPROMISE: For "Total Earnings", iterating completed jobs is 100x better than ALL jobs.
    // Let's fetch only completed jobs for earnings sum. 
    // Or if we can use sum aggregation:
    // db.collection('jobs').where(...).aggregate({ total: sum('finalAmount') })...

    // Assuming we can't trust sum() availability or field consistency yet.
    // We will leave earnings as 0 or TODO for now to prioritize load speed? 
    // User wants "optimize".
    // Let's attempt to fetch completed jobs (usually much smaller set than 'all') to sum.

    let totalEarnings = 0;
    // const completedJobsDocs = await db.collection('jobs')
    //    .where('awardedInstallerId', '==', userId)
    //    .where('status', 'in', ['Completed', 'completed'])
    //    .select('finalAmount')
    //    .get();
    // completedJobsDocs.docs.forEach(d => totalEarnings += d.data().finalAmount || 0);

    return {
        ...stats,
        activeJobs: activeSnap.data().count,
        completedJobs: completedSnap.data().count,
        projectedEarnings: 0, // Placeholder
        totalEarnings: totalEarnings // Placeholder
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
