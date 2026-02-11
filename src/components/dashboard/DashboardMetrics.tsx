"use client";

import { QuickMetricCard } from "./quick-metric-card";
import { Target, Clock, Star, Users } from "lucide-react";
import { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('dashboard');

    if (!metrics) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <QuickMetricCard
                label={t('metrics.avgBids')}
                value={metrics.avgBidsPerJob.toFixed(1)}
                icon={Target}
                tooltip={t('metrics.avgBidsTooltip')}
                className="h-full"
            />

            <QuickMetricCard
                label={t('metrics.timeToFirstBid')}
                value={metrics.avgTimeToFirstBid}
                icon={Clock}
                tooltip={t('metrics.timeToFirstBidTooltip')}
                className="h-full"
            />

            <QuickMetricCard
                label={t('metrics.pendingReviews')}
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
                        ? t('metrics.pendingReviewsActionTooltip')
                        : t('metrics.pendingReviewsNoneTooltip')
                }
                className={cn(
                    "h-full",
                    metrics.pendingReviews > 0 ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/20" : ""
                )}
            />

            <QuickMetricCard
                label={t('metrics.yourNetwork')}
                value={metrics.favoriteInstallers}
                icon={Users}
                onClick={() => router.push("/dashboard/my-installers?tab=favorites")}
                actionable
                tooltip={t('metrics.yourNetworkTooltip')}
                className="h-full"
            />
        </div>
    );
}
