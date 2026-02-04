
import { fetchTransactions } from "@/app/actions/dashboard-data.actions";
import { format, subMonths } from "date-fns";
import { toDate } from "@/lib/utils";
import { InstallerChartsClient } from "./installer-charts-client";

export async function InstallerChartsWidget({ userId }: { userId: string }) {
    const transactions = await fetchTransactions(userId, 100);

    // Process Data for Earnings Chart (Last 6 Months - Released Only)
    const months = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(new Date(), i);
        return {
            name: format(d, 'MMM'),
            fullName: format(d, 'MMM yyyy'),
            amount: 0,
            date: d
        };
    }).reverse();

    transactions.forEach(t => {
        if (t.status === 'released' && t.releasedAt) {
            const date = toDate(t.releasedAt);
            const monthStr = format(date, 'MMM yyyy');
            const monthData = months.find(m => m.fullName === monthStr);
            if (monthData) {
                monthData.amount += t.payoutToInstaller || 0;
            }
        }
    });

    const totalEarnings = transactions
        .filter(t => t.status === 'released')
        .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);

    const pendingPayments = transactions
        .filter(t => t.status === 'funded')
        .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);

    return (
        <InstallerChartsClient
            earningsData={months}
            totalEarnings={totalEarnings}
            pendingPayments={pendingPayments}
        />
    );
}
