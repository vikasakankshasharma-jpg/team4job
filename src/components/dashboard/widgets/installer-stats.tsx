
import { fetchInstallerStats } from "@/app/actions/dashboard-data.actions";
import { Briefcase, Target, UserCheck } from "lucide-react";
import { StatCard } from "@/components/dashboard/cards/stat-card";

export async function InstallerStatsWidget({ userId }: { userId: string }) {
    const stats = await fetchInstallerStats(userId);

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
                title="Open Jobs"
                value={stats.openJobs}
                description="Jobs currently accepting bids"
                icon={Briefcase}
                href="/dashboard/jobs"
                iconBgColor="bg-blue-100 dark:bg-blue-900"
                iconColor="text-blue-600 dark:text-blue-300"
            />
            <StatCard
                title="My Bids"
                value={stats.myBids}
                description="Your bids and awarded jobs"
                icon={Target}
                href="/dashboard/my-bids"
                iconBgColor="bg-purple-100 dark:bg-purple-900"
                iconColor="text-purple-600 dark:text-purple-300"
            />
            <StatCard
                title="Jobs Won"
                value={stats.jobsWon}
                description="Total jobs awarded to you"
                icon={UserCheck}
                href="/dashboard/my-bids?status=Awarded"
                iconBgColor="bg-green-100 dark:bg-green-900"
                iconColor="text-green-600 dark:text-green-300"
            />
        </div>
    );
}
