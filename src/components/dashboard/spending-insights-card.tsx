"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/hooks/use-user";
import { calculateSpendingInsights, SpendingInsights } from "@/lib/services/spending-analytics";

interface SpendingInsightsCardProps {
    userId: string;
}

export function SpendingInsightsCard({ userId }: SpendingInsightsCardProps) {
    const { db } = useFirebase();
    const router = useRouter();
    const [insights, setInsights] = useState<SpendingInsights | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            if (!db) return;

            try {
                setLoading(true);
                const data = await calculateSpendingInsights(db, userId);
                setInsights(data);
            } catch (error) {
                console.error("Error fetching spending insights:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [db, userId]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Spending Insights
                    </CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-1" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!insights) return null;

    const progressPercentage =
        insights.projectedMonthSpend > 0
            ? Math.min((insights.currentMonthSpend / insights.projectedMonthSpend) * 100, 100)
            : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Spending Insights
                </CardTitle>
                <CardDescription>Your hiring budget this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {insights.jobsThisMonth > 0 ? (
                    <>
                        <div>
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Spent This Month</span>
                                <span className="text-2xl font-bold">
                                    ₹{insights.currentMonthSpend.toLocaleString()}
                                </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-2">
                                {insights.projectedMonthSpend > insights.currentMonthSpend ? (
                                    <>
                                        Projected total: ₹{insights.projectedMonthSpend.toLocaleString()}
                                        <span className="text-amber-600 ml-1">
                                            ({insights.projectedMonthSpend - insights.currentMonthSpend > 0
                                                ? `+₹${(insights.projectedMonthSpend - insights.currentMonthSpend).toLocaleString()}`
                                                : ""}{" "}
                                            in progress)
                                        </span>
                                    </>
                                ) : (
                                    <>All jobs completed this month</>
                                )}
                            </p>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Avg Cost/Job</p>
                                <p className="text-lg font-semibold">
                                    ₹{insights.avgCostPerJob.toLocaleString()}
                                </p>
                                {/* Could add trend here if we calculate previous period */}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Top Category</p>
                                <p className="text-lg font-semibold truncate" title={insights.topCategory}>
                                    {insights.topCategory}
                                </p>
                                {insights.topCategoryPercentage > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {insights.topCategoryPercentage}% of spend
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/dashboard/analytics")}
                        >
                            View Detailed Analytics
                        </Button>
                    </>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Wallet className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No spending data yet</p>
                        <p className="text-xs mt-1">Complete your first job to see insights</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => router.push("/dashboard/post-job")}
                        >
                            Post a Job
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
