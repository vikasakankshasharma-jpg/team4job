import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { Job } from "@/lib/types";

export interface SpendingInsights {
    currentMonthSpend: number;
    projectedMonthSpend: number;
    avgCostPerJob: number;
    topCategory: string;
    topCategoryPercentage: number;
    jobsThisMonth: number;
}

/**
 * Calculate comprehensive spending insights for a Job Giver
 */
export async function calculateSpendingInsights(
    db: Firestore,
    userId: string
): Promise<SpendingInsights> {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch completed jobs this month
        const completedThisMonthQuery = query(
            collection(db, "jobs"),
            where("jobGiverId", "==", userId),
            where("status", "==", "Completed"),
            where("completionTimestamp", ">=", Timestamp.fromDate(startOfMonth))
        );

        const completedSnapshot = await getDocs(completedThisMonthQuery);
        const completedJobs = completedSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Job));

        // Calculate current month spend
        const currentMonthSpend = completedJobs.reduce((sum, job) => {
            // Use awarded bid amount
            const amount = job.bids?.find(b => b.installerId === job.awardedInstallerId)?.amount || 0;
            return sum + amount;
        }, 0);

        // Fetch active jobs (In Progress, Pending Confirmation)
        const activeJobsQuery = query(
            collection(db, "jobs"),
            where("jobGiverId", "==", userId),
            where("status", "in", ["In Progress", "Pending Confirmation", "Pending Funding"])
        );

        const activeSnapshot = await getDocs(activeJobsQuery);
        const activeJobs = activeSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Job));

        // Calculate projected spend (current + active jobs)
        const activeJobsAmount = activeJobs.reduce((sum, job) => {
            const amount = job.bids?.find(b => b.installerId === job.awardedInstallerId)?.amount || 0;
            return sum + amount;
        }, 0);

        const projectedMonthSpend = currentMonthSpend + activeJobsAmount;

        // Calculate average cost per job (last 30 days)
        const last30DaysQuery = query(
            collection(db, "jobs"),
            where("jobGiverId", "==", userId),
            where("status", "==", "Completed"),
            where("completionTimestamp", ">=", Timestamp.fromDate(thirtyDaysAgo))
        );

        const last30DaysSnapshot = await getDocs(last30DaysQuery);
        const last30DaysJobs = last30DaysSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Job));

        const avgCostPerJob =
            last30DaysJobs.length > 0
                ? last30DaysJobs.reduce((sum, job) => {
                    const amount = job.bids?.find(b => b.installerId === job.awardedInstallerId)?.amount || 0;
                    return sum + amount;
                }, 0) / last30DaysJobs.length
                : 0;

        // Calculate top category
        const { topCategory, topCategoryPercentage } = calculateTopCategory(completedJobs);

        return {
            currentMonthSpend: Math.round(currentMonthSpend),
            projectedMonthSpend: Math.round(projectedMonthSpend),
            avgCostPerJob: Math.round(avgCostPerJob),
            topCategory,
            topCategoryPercentage,
            jobsThisMonth: completedJobs.length,
        };
    } catch (error) {
        console.error("Error calculating spending insights:", error);
        return {
            currentMonthSpend: 0,
            projectedMonthSpend: 0,
            avgCostPerJob: 0,
            topCategory: "N/A",
            topCategoryPercentage: 0,
            jobsThisMonth: 0,
        };
    }
}

/**
 * Determine the top spending category
 */
function calculateTopCategory(jobs: Job[]): { topCategory: string; topCategoryPercentage: number } {
    if (jobs.length === 0) {
        return { topCategory: "N/A", topCategoryPercentage: 0 };
    }

    const categorySpend: Record<string, number> = {};
    let totalSpend = 0;

    jobs.forEach(job => {
        if (job.jobCategory) {
            const amount = job.bids?.find(b => b.installerId === job.awardedInstallerId)?.amount || 0;
            categorySpend[job.jobCategory] = (categorySpend[job.jobCategory] || 0) + amount;
            totalSpend += amount;
        }
    });

    if (Object.keys(categorySpend).length === 0) {
        return { topCategory: "N/A", topCategoryPercentage: 0 };
    }

    // Find category with highest spend
    const topEntry = Object.entries(categorySpend).sort(([, a], [, b]) => b - a)[0];
    const topCategory = topEntry[0];
    const topCategoryPercentage = totalSpend > 0 ? Math.round((topEntry[1] / totalSpend) * 100) : 0;

    return { topCategory, topCategoryPercentage };
}
