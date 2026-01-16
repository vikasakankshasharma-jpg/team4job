"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import {
    AnalyticsService,
    AnalyticsSummary,
    TimeToHireData,
    SpendingTrendData,
    InstallerPerformance
} from "@/lib/api/analytics";
import { StatCards } from "@/components/analytics/stat-cards-row";
import { TimeToHireChart } from "@/components/analytics/time-to-hire-chart";
import { CostTrendsChart } from "@/components/analytics/cost-trends-chart";
import { InstallerPerformanceTable } from "@/components/analytics/installer-performance-table";
import { InsightsPanel } from "@/components/analytics/insights-panel";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AnalyticsClient() {
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [timeToHire, setTimeToHire] = useState<TimeToHireData[]>([]);
    const [spendingTrends, setSpendingTrends] = useState<SpendingTrendData[]>([]);
    const [topInstallers, setTopInstallers] = useState<InstallerPerformance[]>([]);

    const loadData = async () => {
        if (!user?.id) return;

        try {
            setRefreshing(true);
            // Load all data in parallel
            const [summaryData, hiringData, spendingData, categoryData] = await Promise.all([
                AnalyticsService.getSummary(user.id),
                AnalyticsService.getTimeToHire(user.id),
                AnalyticsService.getSpendingTrends(user.id),
                AnalyticsService.getCategoryBreakdown(user.id)
            ]);

            setSummary(summaryData);
            setTimeToHire(hiringData);
            setSpendingTrends(spendingData);

            // Mocking installer performance for now
            setTopInstallers([]);

        } catch (error) {
            console.error("Failed to load analytics:", error);
            toast({
                title: "Error",
                description: "Failed to load analytics data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [user?.id]);

    // Generate AI insights from data
    const insights = useMemo(() => {
        // TODO: Fix property names to match AnalyticsSummary interface
        return [];
    }, [summary]);


    const handleExport = () => {
        toast({
            title: "Export started",
            description: "Your analytics data is being prepared for download.",
        });
    };

    const handleRefresh = () => {
        loadData();
        toast({
            title: "Refreshing",
            description: "Loading latest analytics data...",
        });
    };

    if (!user) {
        return (
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                <div className="space-y-1">
                    <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 w-96 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="h-64 bg-muted animate-pulse rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        Insights into your hiring performance and spending
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                    >
                        <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        disabled={loading}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <StatCards data={summary} loading={loading} />

            {/* AI Insights */}
            {!loading && insights.length > 0 && (
                <InsightsPanel insights={insights} />
            )}

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                {loading ? (
                    <div className="col-span-2 h-[300px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <TimeToHireChart data={timeToHire} />
                        <CostTrendsChart data={spendingTrends} />
                    </>
                )}
            </div>

            {/* Performance Table */}
            <div className="grid gap-6">
                {loading ? (
                    <div className="h-[200px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <InstallerPerformanceTable data={topInstallers} />
                )}
            </div>

            {/* Empty state for new users */}
            {!loading && summary && summary.totalJobs === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>No Data Yet</CardTitle>
                        <CardDescription>
                            Post your first job to start seeing analytics and insights!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => window.location.href = '/dashboard/post-job'}>
                            Post Your First Job
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
