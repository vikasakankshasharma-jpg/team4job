import { fetchJobGiverStats } from "@/app/actions/dashboard-data.actions";
import { Briefcase, ShieldCheck, UserCheck, AlertOctagon } from "lucide-react";
import { StatCard } from "@/components/dashboard/cards/stat-card"; // Assuming StatCard is client or shared, if it uses hooks it must be client but it seems presentational
import { fetchTransactions } from "@/app/actions/dashboard-data.actions";

// StatCard is likely a Client Component if it has interactivity or just shared. 
// If StatCard is just a function rendering JSX, it works in Server Component.

export async function JobGiverStatsWidget({ userId }: { userId: string }) {
    const stats = await fetchJobGiverStats(userId);
    const transactions = await fetchTransactions(userId, 50);

    const fundsInEscrow = transactions
        .filter(t => t.status === 'funded')
        .reduce((acc, t) => acc + (t.totalPaidByGiver || 0), 0);

    return (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <StatCard
                title="Active Jobs"
                value={stats.activeJobs}
                description="Jobs not yet completed"
                icon={Briefcase}
                href="/dashboard/posted-jobs"
                iconBgColor="bg-blue-100 dark:bg-blue-900"
                iconColor="text-blue-600 dark:text-blue-300"
            />
            <StatCard
                title="Funds in Secure Deposit"
                value={`₹${fundsInEscrow.toLocaleString()}`}
                description="Securely Locked for active jobs"
                icon={ShieldCheck}
                href="/dashboard/posted-jobs"
                iconBgColor="bg-encrow-100 dark:bg-indigo-900"
                iconColor="text-indigo-600 dark:text-indigo-300"
            />
            <StatCard
                title="Completed Jobs"
                value={stats.completedJobs}
                description="Successfully finished projects"
                icon={UserCheck}
                href="/dashboard/posted-jobs?tab=archived"
                iconBgColor="bg-green-100 dark:bg-green-900"
                iconColor="text-green-600 dark:text-green-300"
            />
            <StatCard
                title="Open Disputes"
                value={stats.openDisputes}
                description="Disputes needing resolution"
                icon={AlertOctagon}
                href="/dashboard/disputes"
                iconBgColor="bg-red-100 dark:bg-red-900"
                iconColor="text-red-600 dark:text-red-300"
            />
        </div>
    );
}
