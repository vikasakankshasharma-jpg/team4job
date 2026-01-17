import { StatCard } from "@/components/dashboard/cards/stat-card";
import { Briefcase, CheckCircle, DollarSign, Activity } from "lucide-react";
import { AnalyticsSummary } from "@/lib/api/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardsProps {
    data: AnalyticsSummary | null;
    loading: boolean;
}

export function StatCards({ data, loading }: StatCardsProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold bg-muted h-8 w-24 rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total Jobs"
                value={data.totalJobs}
                description={`${data.activeJobs} active now`}
                icon={Briefcase}
                href="#"
                iconBgColor="bg-blue-100 dark:bg-blue-900"
                iconColor="text-blue-600 dark:text-blue-300"
            />

            <StatCard
                title="Completed"
                value={data.completedJobs}
                description={`${((data.completedJobs / (data.totalJobs || 1)) * 100).toFixed(0)}% completion rate`}
                icon={CheckCircle}
                href="#"
                iconBgColor="bg-green-100 dark:bg-green-900"
                iconColor="text-green-600 dark:text-green-300"
            />

            <StatCard
                title="Total Spend"
                value={`₹${data.totalSpend.toLocaleString()}`}
                description="Lifetime project value"
                icon={DollarSign}
                href="#"
                iconBgColor="bg-yellow-100 dark:bg-yellow-900"
                iconColor="text-yellow-600 dark:text-yellow-300"
            />

            <StatCard
                title="Avg Rating"
                value={data.avgRating > 0 ? data.avgRating.toFixed(1) : 'N/A'}
                description="Based on feedback"
                icon={Activity}
                href="#"
                iconBgColor="bg-purple-100 dark:bg-purple-900"
                iconColor="text-purple-600 dark:text-purple-300"
            />
        </div>
    );
}
