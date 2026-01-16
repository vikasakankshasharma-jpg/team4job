import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle, DollarSign, Activity } from "lucide-react";
import { AnalyticsSummary } from "@/lib/api/analytics";

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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.totalJobs}</div>
                    <p className="text-xs text-muted-foreground">
                        {data.activeJobs} active now
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.completedJobs}</div>
                    <p className="text-xs text-muted-foreground">
                        {((data.completedJobs / (data.totalJobs || 1)) * 100).toFixed(0)}% completion rate
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{data.totalSpend.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Lifetime project value
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.avgRating > 0 ? data.avgRating.toFixed(1) : 'N/A'}</div>
                    <p className="text-xs text-muted-foreground">
                        Based on feedback
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
