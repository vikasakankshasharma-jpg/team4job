import { db } from '@/lib/firebase/client';
import {
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy
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

export interface InstallerPerformance {
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

export const AnalyticsService = {

    /**
     * Get high-level summary stats for a job giver
     */
    async getSummary(userId: string): Promise<AnalyticsSummary> {
        const q = query(
            collection(db, JOBS_COLLECTION),
            where('jobGiverId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const jobs = querySnapshot.docs.map(doc => doc.data() as Job);

        const completed = jobs.filter(j => j.status === 'Completed');
        const active = jobs.filter(j => ['Open for Bidding', 'In Progress', 'Awarded'].includes(j.status));

        let totalSpend = 0;
        completed.forEach(job => {
            // @ts-ignore - Assuming acceptedBidAmount might exist or derive from budget median
            const amount = job.invoice?.totalAmount || (job.priceEstimate ? (job.priceEstimate.min + job.priceEstimate.max) / 2 : 0);
            totalSpend += amount;
        });

        return {
            totalJobs: jobs.length,
            completedJobs: completed.length,
            totalSpend,
            activeJobs: active.length,
            avgRating: 0 // Placeholder
        };
    },

    /**
     * Calculate average time to hire (Posted -> In Progress) over last 6 months
     */
    async getTimeToHire(userId: string): Promise<TimeToHireData[]> {
        const sixMonthsAgo = subMonths(new Date(), 6);

        // Using postedAt for range query
        const q = query(
            collection(db, JOBS_COLLECTION),
            where('jobGiverId', '==', userId),
            where('postedAt', '>=', Timestamp.fromDate(sixMonthsAgo))
        );

        const querySnapshot = await getDocs(q);
        const jobs = querySnapshot.docs.map(doc => doc.data() as Job);

        // Group by month
        const groupedData: Record<string, number[]> = {};
        const months = eachMonthOfInterval({ start: sixMonthsAgo, end: new Date() });

        months.forEach(month => {
            groupedData[format(month, 'MMM yyyy')] = [];
        });

        jobs.forEach(job => {
            // Using postedAt as start
            const postedDate = job.postedAt instanceof Timestamp ? job.postedAt.toDate() : new Date();

            // Using awardedInstallerId or status change as evidence of hire
            // We don't have exact 'hiredAt' field comfortably available in all jobs maybe, 
            // but let's check if there is one. 
            // Job type has `awardedInstaller` but no `awardedAt`. 
            // It has `jobStartDate`.
            // Let's use `jobStartDate` as a proxy for "hired" if available, or just skip if null.

            const hiredDate = job.jobStartDate instanceof Timestamp ? job.jobStartDate.toDate() : null;

            if (hiredDate) {
                const days = differenceInDays(hiredDate, postedDate);
                const monthKey = format(hiredDate, 'MMM yyyy');

                if (groupedData[monthKey]) {
                    groupedData[monthKey].push(days); // Only non-negative
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
     * Calculate spending trends over last 12 months
     */
    async getSpendingTrends(userId: string): Promise<SpendingTrendData[]> {
        const oneYearAgo = subMonths(new Date(), 12);

        const q = query(
            collection(db, JOBS_COLLECTION),
            where('jobGiverId', '==', userId),
            where('status', '==', 'Completed'),
            where('postedAt', '>=', Timestamp.fromDate(oneYearAgo))
        );

        const querySnapshot = await getDocs(q);
        const jobs = querySnapshot.docs.map(doc => doc.data() as Job);

        const groupedData: Record<string, number> = {};
        const months = eachMonthOfInterval({ start: oneYearAgo, end: new Date() });

        months.forEach(month => {
            groupedData[format(month, 'MMM')] = 0;
        });

        jobs.forEach(job => {
            // Using postedAt as proxy for project month
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
     * Get Category breakdown of all jobs
     */
    async getCategoryBreakdown(userId: string): Promise<CategoryBreakdown[]> {
        const q = query(
            collection(db, JOBS_COLLECTION),
            where('jobGiverId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const jobs = querySnapshot.docs.map(doc => doc.data() as Job);

        const categoryMap: Record<string, number> = {};

        jobs.forEach(job => {
            const cat = job.jobCategory || 'Uncategorized';
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });

        return Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }
};
