import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { Job } from "@/lib/types";
import { toDate } from "@/lib/utils";

export interface ProfessionalRelationshipMetrics {
    jobsCompleted: number;
    totalSpent: number;
    avgRatingFromYou: number;
    onTimePercentage: number;
    lastHiredDate: Date | null;
    preferredCategories: string[];
}

/**
 * Calculate relationship metrics between a Client and an Professional
 */
export async function calculateProfessionalMetrics(
    db: Firestore,
    clientId: string,
    professionalId: string
): Promise<ProfessionalRelationshipMetrics> {
    try {
        // Query all completed jobs between this client and Professional
        const jobsQuery = query(
            collection(db, "jobs"),
            where("clientId", "==", clientId),
            where("awardedProfessionalId", "==", professionalId),
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
            const bidAmount = job.bids?.find(b => b.professionalId === professionalId)?.amount || 0;
            return sum + bidAmount;
        }, 0);

        // Average rating from this client
        const ratings = jobs
            .map(job => job.clientReview?.rating)
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
 * Batch calculate metrics for multiple Professionals (more efficient)
 */
export async function calculateBatchProfessionalMetrics(
    db: Firestore,
    clientId: string,
    professionalIds: string[]
): Promise<Map<string, ProfessionalRelationshipMetrics>> {
    const metricsMap = new Map<string, ProfessionalRelationshipMetrics>();

    try {
        // Fetch all completed jobs for this client in one query
        const jobsQuery = query(
            collection(db, "jobs"),
            where("clientId", "==", clientId),
            where("status", "==", "Completed")
        );

        const jobsSnapshot = await getDocs(jobsQuery);
        const allJobs = jobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Job));

        // Group jobs by Professional
        const jobsByProfessional = new Map<string, Job[]>();
        allJobs.forEach(job => {
            if (job.awardedProfessionalId && professionalIds.includes(job.awardedProfessionalId)) {
                if (!jobsByProfessional.has(job.awardedProfessionalId)) {
                    jobsByProfessional.set(job.awardedProfessionalId, []);
                }
                jobsByProfessional.get(job.awardedProfessionalId)!.push(job);
            }
        });

        // Calculate metrics for each Professional
        professionalIds.forEach(professionalId => {
            const jobs = jobsByProfessional.get(professionalId) || [];

            if (jobs.length === 0) {
                metricsMap.set(professionalId, {
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
                const bidAmount = job.bids?.find(b => b.professionalId === professionalId)?.amount || 0;
                return sum + bidAmount;
            }, 0);

            const ratings = jobs
                .map(job => job.clientReview?.rating)
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

            metricsMap.set(professionalId, {
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
        // Return empty metrics for all Professionals on error
        professionalIds.forEach(id => {
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
