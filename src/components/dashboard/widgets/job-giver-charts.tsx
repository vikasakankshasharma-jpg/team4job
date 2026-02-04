import { fetchTransactions, fetchJobGiverStats } from "@/app/actions/dashboard-data.actions";
import { format, subMonths } from "date-fns";
import { toDate } from "@/lib/utils";
import { JobGiverChartsClient } from "./job-giver-charts-client";

export async function JobGiverChartsWidget({ userId }: { userId: string }) {
    const transactions = await fetchTransactions(userId, 100); // Fetch enough for history
    const stats = await fetchJobGiverStats(userId);

    // Process Data for Spending Chart (Last 6 Months - Released Only)
    const months = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(new Date(), i);
        return {
            name: format(d, 'MMM'),
            fullName: format(d, 'MMM yyyy'),
            amount: 0
        };
    }).reverse();

    transactions.forEach(t => {
        if (t.status === 'released' && t.releasedAt) {
            const date = toDate(t.releasedAt);
            const monthStr = format(date, 'MMM yyyy');
            const monthData = months.find(m => m.fullName === monthStr);
            if (monthData) {
                // @ts-ignore - Transaction type might result missing optional
                monthData.amount += t.totalPaidByGiver || 0;
            }
        }
    });

    const totalSpent = transactions
        .filter(t => t.status === 'released')
        .reduce((acc, t) => acc + (t.totalPaidByGiver || 0), 0);

    const jobStatusData = [
        { name: 'Active', value: stats.activeJobs, color: '#0088FE' },
        { name: 'Completed', value: stats.completedJobs, color: '#00C49F' },
        { name: 'Cancelled', value: stats.cancelledJobs, color: '#FF8042' }
    ].filter(d => d.value > 0);

    return (
        <JobGiverChartsClient
            spendingData={months}
            totalSpent={totalSpent}
            jobStatusData={jobStatusData}
        />
    );
}
