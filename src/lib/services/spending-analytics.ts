import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { Job } from "@/lib/types";
import { toDate } from "@/lib/utils";

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

        // Fetch all jobs for the user once to avoid multiple composite queries/indexes
        const allJobsQuery = query(
            collection(db, "jobs"),
            where("jobGiverId", "==", userId)
        );

        const allSnapshot = await getDocs(allJobsQuery);
        const allJobs = allSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Job));

        // 1. Filter completed jobs this month
        const completedJobs = allJobs.filter(job =>
            job.status === "Completed" &&
            job.completionTimestamp &&
            toDate(job.completionTimestamp) >= startOfMonth
        );

        // Calculate current month spend
        const currentMonthSpend = completedJobs.reduce((sum, job) => {
            const amount = job.bids?.find(b => b.installerId === job.awardedInstallerId)?.amount || 0;
            return sum + amount;
        }, 0);

        // 2. Filter active jobs (In Progress, Pending Confirmation, Pending Funding)
        const activeJobs = allJobs.filter(job =>
            ["In Progress", "Pending Confirmation", "Pending Funding"].includes(job.status)
        );

        // Calculate projected spend (current + active jobs)
        const activeJobsAmount = activeJobs.reduce((sum, job) => {
            const amount = job.bids?.find(b => b.installerId === job.awardedInstallerId)?.amount || 0;
            return sum + amount;
        }, 0);

        const projectedMonthSpend = currentMonthSpend + activeJobsAmount;

        // 3. Filter average cost per job (last 30 days)
        const last30DaysJobs = allJobs.filter(job =>
            job.status === "Completed" &&
            job.completionTimestamp &&
            toDate(job.completionTimestamp) >= thirtyDaysAgo
        );

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
