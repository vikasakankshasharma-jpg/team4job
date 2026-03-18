import { db } from '@/lib/firebase/client';
import {
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import { Job } from '@/lib/types';
import { differenceInDays, subMonths, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

export interface AnalyticsSummary {
    totalJobs: number;
    completedJobs: number;
    totalSpend: number;
    activeJobs: number;
    avgRating: number;
}

export interface TimeToHireData {
    date: string; // "Jan 2024"
    days: number;
}

export interface SpendingTrendData {
    month: string; // "Jan"
    amount: number;
}

export interface ProfessionalPerformance {
    id: string;
    name: string;
    avatarUrl?: string;
    jobsCount: number;
    totalPaid: number;
    avgRating: number;
}

export interface CategoryBreakdown {
    name: string;
    value: number; // Count or Spend
}

const JOBS_COLLECTION = 'jobs';

// Output Interface
export interface AnalyticsData {
    summary: AnalyticsSummary;
    timeToHire: TimeToHireData[];
    spendingTrends: SpendingTrendData[];
    topProfessionals: ProfessionalPerformance[];
}

export const AnalyticsService = {

    /**
     * Master function to fetch all analytics data in ONE read operation
     */
    async getAnalytics(userId: string): Promise<AnalyticsData> {
        if (!db) {
            return {
                summary: { totalJobs: 0, completedJobs: 0, totalSpend: 0, activeJobs: 0, avgRating: 0 },
                timeToHire: [],
                spendingTrends: [],
                topProfessionals: []
            };
        }

        // 1. Single efficient read of all user's jobs (up to safe limit)
        const q = query(
            collection(db, JOBS_COLLECTION),
            where('clientId', '==', userId),
            orderBy('postedAt', 'desc'),
            limit(1000) // Safety cap
        );

        const querySnapshot = await getDocs(q);
        const allJobs = querySnapshot.docs.map(doc => doc.data() as Job);

        // 2. Calculate all metrics in-memory
        return {
            summary: this.calculateSummary(allJobs),
            timeToHire: this.calculateTimeToHire(allJobs),
            spendingTrends: this.calculateSpendingTrends(allJobs),
            topProfessionals: this.calculateProfessionalPerformance(allJobs)
        };
    },

    /**
     * Calculate high-level summary stats (In-Memory)
     */
    calculateSummary(jobs: Job[]): AnalyticsSummary {
        const completed = jobs.filter(j => j.status === 'Completed');
        const active = jobs.filter(j => ['Open for Bidding', 'In Progress', 'Awarded'].includes(j.status));

        let totalSpend = 0;
        completed.forEach(job => {
            // @ts-ignore
            const amount = job.invoice?.totalAmount || (job.priceEstimate ? (job.priceEstimate.min + job.priceEstimate.max) / 2 : 0);
            totalSpend += amount;
        });

        return {
            totalJobs: jobs.length,
            completedJobs: completed.length,
            totalSpend,
            activeJobs: active.length,
            avgRating: 0
        };
    },

    /**
     * Calculate average time to hire (In-Memory)
     */
    calculateTimeToHire(jobs: Job[]): TimeToHireData[] {
        const sixMonthsAgo = subMonths(new Date(), 6);

        // Filter relevant jobs first
        const relevantJobs = jobs.filter(job => {
            const postedDate = job.postedAt instanceof Timestamp ? job.postedAt.toDate() : new Date();
            return postedDate >= sixMonthsAgo;
        });

        // Group by month
        const groupedData: Record<string, number[]> = {};
        const months = eachMonthOfInterval({ start: sixMonthsAgo, end: new Date() });

        months.forEach(month => {
            groupedData[format(month, 'MMM yyyy')] = [];
        });

        relevantJobs.forEach(job => {
            const postedDate = job.postedAt instanceof Timestamp ? job.postedAt.toDate() : new Date();
            const hiredDate = job.jobStartDate instanceof Timestamp ? job.jobStartDate.toDate() : null;

            if (hiredDate) {
                const days = differenceInDays(hiredDate, postedDate);
                const monthKey = format(hiredDate, 'MMM yyyy');

                if (groupedData[monthKey]) {
                    groupedData[monthKey].push(days);
                }
            }
        });

        return months.map(month => {
            const key = format(month, 'MMM yyyy');
            const daysArray = groupedData[key] || [];
            const avgDiv = daysArray.length || 1;
            const totalDays = daysArray.reduce((acc, val) => acc + val, 0);

            return {
                date: key,
                days: daysArray.length > 0 ? Math.round(totalDays / avgDiv) : 0
            };
        });
    },

    /**
     * Calculate spending trends (In-Memory)
     */
    calculateSpendingTrends(jobs: Job[]): SpendingTrendData[] {
        const oneYearAgo = subMonths(new Date(), 12);

        const relevantJobs = jobs.filter(job => {
            const postedDate = job.postedAt instanceof Timestamp ? job.postedAt.toDate() : new Date();
            return job.status === 'Completed' && postedDate >= oneYearAgo;
        });

        const groupedData: Record<string, number> = {};
        const months = eachMonthOfInterval({ start: oneYearAgo, end: new Date() });

        months.forEach(month => {
            groupedData[format(month, 'MMM')] = 0;
        });

        relevantJobs.forEach(job => {
            const date = job.postedAt instanceof Timestamp ? job.postedAt.toDate() : new Date();
            const monthKey = format(date, 'MMM');
            const amount = job.invoice?.totalAmount || (job.priceEstimate ? (job.priceEstimate.min + job.priceEstimate.max) / 2 : 0);

            if (typeof groupedData[monthKey] !== 'undefined') {
                groupedData[monthKey] += amount;
            }
        });

        return months.map(month => ({
            month: format(month, 'MMM'),
            amount: groupedData[format(month, 'MMM')] || 0
        }));
    },

    /**
     * Calculate Professional performance (In-Memory)
     */
    calculateProfessionalPerformance(jobs: Job[]): ProfessionalPerformance[] {
        const completedJobs = jobs.filter(j => j.status === 'Completed');

        const ProfessionalMap: Record<string, {
            name: string;
            count: number;
            totalPaid: number;
            totalRating: number;
            ratedCount: number;
        }> = {};

        completedJobs.forEach(job => {
            const professionalId = job.awardedProfessionalId;
            if (!professionalId) return;

            if (!ProfessionalMap[professionalId]) {
                const name = job.billingSnapshot?.professionalName || 'Unknown Professional';
                ProfessionalMap[professionalId] = {
                    name,
                    count: 0,
                    totalPaid: 0,
                    totalRating: 0,
                    ratedCount: 0
                };
            }

            const amount = job.invoice?.totalAmount || 0;
            ProfessionalMap[professionalId].count += 1;
            ProfessionalMap[professionalId].totalPaid += amount;

            if (job.professionalReview?.rating) {
                ProfessionalMap[professionalId].totalRating += job.professionalReview.rating;
                ProfessionalMap[professionalId].ratedCount += 1;
            }
        });

        return Object.entries(ProfessionalMap).map(([id, data]) => ({
            id,
            name: data.name,
            jobsCount: data.count,
            totalPaid: data.totalPaid,
            avgRating: data.ratedCount > 0 ? data.totalRating / data.ratedCount : 0
        })).sort((a, b) => b.totalPaid - a.totalPaid);
    },

    // Legacy Support (Optional - kept for interface compatibility if needed elsewhere, but ideally updated)
    // For now, we are replacing the logic completely. The client code MUST be updated.
    getSummary: async () => ({ totalJobs: 0, completedJobs: 0, totalSpend: 0, activeJobs: 0, avgRating: 0 }),
    getTimeToHire: async () => [],
    getSpendingTrends: async () => [],
    getProfessionalPerformance: async () => [],
    getCategoryBreakdown: async () => []
};
