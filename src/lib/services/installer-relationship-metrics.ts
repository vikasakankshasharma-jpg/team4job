import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { Job } from "@/lib/types";
import { toDate } from "@/lib/utils";

export interface InstallerRelationshipMetrics {
    jobsCompleted: number;
    totalSpent: number;
    avgRatingFromYou: number;
    onTimePercentage: number;
    lastHiredDate: Date | null;
    preferredCategories: string[];
}

/**
 * Calculate relationship metrics between a Job Giver and an Installer
 */
export async function calculateInstallerMetrics(
    db: Firestore,
    jobGiverId: string,
    installerId: string
): Promise<InstallerRelationshipMetrics> {
    try {
        // Query all completed jobs between this job giver and installer
        const jobsQuery = query(
            collection(db, "jobs"),
            where("jobGiverId", "==", jobGiverId),
            where("awardedInstallerId", "==", installerId),
            where("status", "==", "Completed")
        );

        const jobsSnapshot = await getDocs(jobsQuery);
        const jobs = jobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Job));

        if (jobs.length === 0) {
            return {
                jobsCompleted: 0,
                totalSpent: 0,
                avgRatingFromYou: 0,
                onTimePercentage: 0,
                lastHiredDate: null,
                preferredCategories: [],
            };
        }

        // Calculate metrics
        const jobsCompleted = jobs.length;

        // Total spent - sum of awarded bid amounts
        const totalSpent = jobs.reduce((sum, job) => {
            const bidAmount = job.bids?.find(b => b.installerId === installerId)?.amount || 0;
            return sum + bidAmount;
        }, 0);

        // Average rating from this job giver
        const ratings = jobs
            .map(job => job.jobGiverReview?.rating)
            .filter(rating => rating !== undefined && rating !== null) as number[];

        const avgRatingFromYou = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;

        // On-time percentage
        const jobsWithDeadline = jobs.filter(job => job.deadline && job.completionTimestamp);
        const onTimeJobs = jobsWithDeadline.filter(job => {
            const deadline = toDate(job.deadline!);
            const completion = toDate(job.completionTimestamp!);
            return completion <= deadline;
        });

        const onTimePercentage = jobsWithDeadline.length > 0
            ? Math.round((onTimeJobs.length / jobsWithDeadline.length) * 100)
            : 100; // Default to 100% if no deadlines set

        // Last hired date
        const completionDates = jobs
            .map(job => job.completionTimestamp)
            .filter(ts => ts !== undefined && ts !== null)
            .map(ts => toDate(ts!));

        const lastHiredDate = completionDates.length > 0
            ? new Date(Math.max(...completionDates.map(d => d.getTime())))
            : null;

        // Preferred categories (top 3)
        const categoryCount: Record<string, number> = {};
        jobs.forEach(job => {
            if (job.jobCategory) {
                categoryCount[job.jobCategory] = (categoryCount[job.jobCategory] || 0) + 1;
            }
        });

        const preferredCategories = Object.entries(categoryCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([category]) => category);

        return {
            jobsCompleted,
            totalSpent: Math.round(totalSpent),
            avgRatingFromYou: Math.round(avgRatingFromYou * 10) / 10,
            onTimePercentage,
            lastHiredDate,
            preferredCategories,
        };
    } catch (error) {
        console.error("Error calculating installer metrics:", error);
        return {
            jobsCompleted: 0,
            totalSpent: 0,
            avgRatingFromYou: 0,
            onTimePercentage: 0,
            lastHiredDate: null,
            preferredCategories: [],
        };
    }
}

/**
 * Batch calculate metrics for multiple installers (more efficient)
 */
export async function calculateBatchInstallerMetrics(
    db: Firestore,
    jobGiverId: string,
    installerIds: string[]
): Promise<Map<string, InstallerRelationshipMetrics>> {
    const metricsMap = new Map<string, InstallerRelationshipMetrics>();

    try {
        // Fetch all completed jobs for this job giver in one query
        const jobsQuery = query(
            collection(db, "jobs"),
            where("jobGiverId", "==", jobGiverId),
            where("status", "==", "Completed")
        );

        const jobsSnapshot = await getDocs(jobsQuery);
        const allJobs = jobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Job));

        // Group jobs by installer
        const jobsByInstaller = new Map<string, Job[]>();
        allJobs.forEach(job => {
            if (job.awardedInstallerId && installerIds.includes(job.awardedInstallerId)) {
                if (!jobsByInstaller.has(job.awardedInstallerId)) {
                    jobsByInstaller.set(job.awardedInstallerId, []);
                }
                jobsByInstaller.get(job.awardedInstallerId)!.push(job);
            }
        });

        // Calculate metrics for each installer
        installerIds.forEach(installerId => {
            const jobs = jobsByInstaller.get(installerId) || [];

            if (jobs.length === 0) {
                metricsMap.set(installerId, {
                    jobsCompleted: 0,
                    totalSpent: 0,
                    avgRatingFromYou: 0,
                    onTimePercentage: 0,
                    lastHiredDate: null,
                    preferredCategories: [],
                });
                return;
            }

            const jobsCompleted = jobs.length;

            const totalSpent = jobs.reduce((sum, job) => {
                const bidAmount = job.bids?.find(b => b.installerId === installerId)?.amount || 0;
                return sum + bidAmount;
            }, 0);

            const ratings = jobs
                .map(job => job.jobGiverReview?.rating)
                .filter(rating => rating !== undefined && rating !== null) as number[];

            const avgRatingFromYou = ratings.length > 0
                ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
                : 0;

            const jobsWithDeadline = jobs.filter(job => job.deadline && job.completionTimestamp);
            const onTimeJobs = jobsWithDeadline.filter(job => {
                const deadline = toDate(job.deadline!);
                const completion = toDate(job.completionTimestamp!);
                return completion <= deadline;
            });

            const onTimePercentage = jobsWithDeadline.length > 0
                ? Math.round((onTimeJobs.length / jobsWithDeadline.length) * 100)
                : 100;

            const completionDates = jobs
                .map(job => job.completionTimestamp)
                .filter(ts => ts !== undefined && ts !== null)
                .map(ts => toDate(ts!));

            const lastHiredDate = completionDates.length > 0
                ? new Date(Math.max(...completionDates.map(d => d.getTime())))
                : null;

            const categoryCount: Record<string, number> = {};
            jobs.forEach(job => {
                if (job.jobCategory) {
                    categoryCount[job.jobCategory] = (categoryCount[job.jobCategory] || 0) + 1;
                }
            });

            const preferredCategories = Object.entries(categoryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([category]) => category);

            metricsMap.set(installerId, {
                jobsCompleted,
                totalSpent: Math.round(totalSpent),
                avgRatingFromYou: Math.round(avgRatingFromYou * 10) / 10,
                onTimePercentage,
                lastHiredDate,
                preferredCategories,
            });
        });

        return metricsMap;
    } catch (error) {
        console.error("Error calculating batch installer metrics:", error);

        // Return empty metrics for all installers on error
        installerIds.forEach(id => {
            metricsMap.set(id, {
                jobsCompleted: 0,
                totalSpent: 0,
                avgRatingFromYou: 0,
                onTimePercentage: 0,
                lastHiredDate: null,
                preferredCategories: [],
            });
        });

        return metricsMap;
    }
}
