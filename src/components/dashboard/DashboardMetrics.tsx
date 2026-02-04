"use client";

import { QuickMetricCard } from "./quick-metric-card";
import { Target, Clock, Star, Users } from "lucide-react";
import { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface QuickMetrics {
    avgBidsPerJob: number;
    avgTimeToFirstBid: string;
    pendingReviews: number;
    favoriteInstallers: number;
}

interface DashboardMetricsProps {
    userId: string;
    user: User;
    metrics?: QuickMetrics;
}

export function DashboardMetrics({ userId, user, metrics }: DashboardMetricsProps) {
    const router = useRouter();

    if (!metrics) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <QuickMetricCard
                label="Avg Bids/Job"
                value={metrics.avgBidsPerJob.toFixed(1)}
                icon={Target}
                tooltip="Average number of bids you receive per job (last 90 days)"
                className="h-full"
            />

            <QuickMetricCard
                label="Time to 1st Bid"
                value={metrics.avgTimeToFirstBid}
                icon={Clock}
                tooltip="Average time before receiving your first bid"
                className="h-full"
            />

            <QuickMetricCard
                label="Pending Reviews"
                value={metrics.pendingReviews}
                icon={Star}
                actionable={metrics.pendingReviews > 0}
                onClick={
                    metrics.pendingReviews > 0
                        ? () => router.push("/dashboard/posted-jobs?tab=completed")
                        : undefined
                }
                tooltip={
                    metrics.pendingReviews > 0
                        ? "Click to review completed jobs"
                        : "All completed jobs have been reviewed"
                }
                className={cn(
                    "h-full",
                    metrics.pendingReviews > 0 ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/20" : ""
                )}
            />

            <QuickMetricCard
                label="Your Network"
                value={metrics.favoriteInstallers}
                icon={Users}
                onClick={() => router.push("/dashboard/my-installers?tab=favorites")}
                actionable
                tooltip="Installers you've favorited. Click to view them."
                className="h-full"
            />
        </div>
    );
}
