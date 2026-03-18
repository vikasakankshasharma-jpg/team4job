"use client";

import { useState, useEffect, useMemo } from "react";
import { JobsMetricsRow } from "./JobsMetricsRow"
import { RecommendedJobsList } from "./RecommendedJobsList"
import { useUser } from "@/hooks/use-user"
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Briefcase,
    ShieldCheck,
    UserCheck,
    AlertOctagon,
    ArrowRight,
    PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import { toDate } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/dashboard/cards/stat-card";
import { ActionRequiredDashboard } from "@/components/notifications/action-required-dashboard";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { RecommendedProfessionalsCard } from "@/components/dashboard/recommended-professionals-card";
import { SpendingInsightsCard } from "@/components/dashboard/spending-insights-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { ClientStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";
import { TRANSACTION_STATUS } from "@/lib/constants/statuses";

const SpendingHistoryChart = dynamic(() => import("@/components/dashboard/charts/client-charts").then(mod => mod.SpendingHistoryChart), { ssr: false });
const JobStatusChart = dynamic(() => import("@/components/dashboard/charts/client-charts").then(mod => mod.JobStatusChart), { ssr: false });

export function ClientDashboard({ stats, transactions, loading = false, quickMetrics }: {
    stats: ClientStats,
    transactions: Transaction[],
    loading?: boolean,
    quickMetrics?: any
}) {
    const { user } = useUser();
    const { setHelp } = useHelp();
    const t = useTranslations('client.dashboard');
    const tDash = useTranslations('dashboard');
    const tJob = useTranslations('job');
    const tCommon = useTranslations('common');

    // Process Data for Spending Chart (Last 6 Months - Released Only)
    const { spendingData, jobStatusData, totalSpent, fundsInEscrow } = useMemo(() => {
        const months = Array.from({ length: 6 }).map((_, i) => {
            const d = subMonths(new Date(), i);
            return {
                name: format(d, 'MMM'),
                fullName: format(d, 'MMM yyyy'),
                amount: 0
            };
        }).reverse();

        const txList = transactions || [];
        txList.forEach(t => {
            if (t.status === TRANSACTION_STATUS.RELEASED && t.releasedAt) {
                const date = toDate(t.releasedAt);
                const monthStr = format(date, 'MMM yyyy');
                const monthData = months.find(m => m.fullName === monthStr);
                if (monthData) {
                    monthData.amount += t.totalPaidByClient || 0;
                }
            }
        });

        const totalSpent = txList
            .filter(t => t.status === TRANSACTION_STATUS.RELEASED)
            .reduce((acc, t) => acc + (t.totalPaidByClient || 0), 0);

        const fundsInEscrow = txList
            .filter(t => t.status === TRANSACTION_STATUS.FUNDED)
            .reduce((acc, t) => acc + (t.totalPaidByClient || 0), 0);

        const jobStatusData = [
            { name: 'Active', value: stats.activeJobs, color: '#0088FE' }, // Blue
            { name: 'Completed', value: stats.completedJobs, color: '#00C49F' }, // Green
            { name: 'Cancelled', value: stats.cancelledJobs, color: '#FF8042' } // Orange
        ].filter(d => d.value > 0);

        return { spendingData: months, jobStatusData, totalSpent, fundsInEscrow };
    }, [stats, transactions]);

    useEffect(() => {
        setHelp({
            title: t('guide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('guide.welcome')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">{t('guide.activeJobsLabel')}</span> {t('guide.activeJobsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.fundsEscrowLabel')}</span> {t('guide.fundsInEscrowDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.totalBidsLabel')}</span> {t('guide.totalBidsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.completedJobsLabel')}</span> {t('guide.completedJobsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.needProfessionalLabel')}</span> {t('guide.needProfessionalDesc')}
                        </li>
                    </ul>
                    <p>{t('guide.bottomText')}</p>
                </div>
            )
        });
    }, [setHelp, t]);

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{tDash('welcomeUser', { name: user?.name || 'User' })}</h1>
                    <p className="text-muted-foreground">{t('dashboardDesc')}</p>
                </div>
                <div className="flex gap-2">
                     <Button asChild size="sm">
                        <Link href="/wizard">
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('postNewJob')}
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="mb-6">
                <ActionRequiredDashboard />
            </div>

            {/* Phase 11: Quick Metrics Row */}
            {user && <DashboardMetrics userId={user.id} user={user} metrics={quickMetrics} />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title={t('activeJobs')}
                    value={stats.activeJobs}
                    description={t('activeJobsDesc')}
                    icon={Briefcase}
                    href="/dashboard/posted-jobs"
                    iconBgColor="bg-primary/10"
                    iconColor="text-primary"
                />
                <StatCard
                    title={t('fundsInEscrow')}
                    value={`₹${fundsInEscrow.toLocaleString()}`}
                    description={t('fundsInEscrowDesc')}
                    icon={ShieldCheck}
                    href="/dashboard/posted-jobs"
                    iconBgColor="bg-success/10"
                    iconColor="text-success"
                />
                <StatCard
                    title={t('completedJobs')}
                    value={stats.completedJobs}
                    description={t('completedJobsDesc')}
                    icon={UserCheck}
                    href="/dashboard/posted-jobs?tab=archived"
                    iconBgColor="bg-primary/10"
                    iconColor="text-primary"
                />
                <StatCard
                    title={t('openDisputes')}
                    value={stats.openDisputes}
                    description={t('openDisputesDesc')}
                    icon={AlertOctagon}
                    href="/dashboard/disputes"
                    iconBgColor="bg-destructive/10"
                    iconColor="text-destructive"
                />
            </div>

            {/* Phase 11: Enhanced Layout - Two-column with sidebar widgets */}
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
                {/* Left column: Charts */}
                <div className="lg:col-span-2 space-y-6">
                    <SpendingHistoryChart data={spendingData} totalSpent={totalSpent} />

                    <JobStatusChart data={jobStatusData} />
                </div>

                {/* Right column: Phase 11 Widgets */}
                <div className="space-y-6">
                    {user && <RecommendedJobsList user={user} />}
                    {user && <SpendingInsightsCard userId={user.id} />}
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card data-tour="need-Professional-card" className="col-span-1 border-0 shadow-md shadow-primary/5 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold tracking-tight">{t('needProfessional')}</CardTitle>
                        <CardDescription>
                            {t('needProfessionalDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/wizard">
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('postNewJob')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <RecentActivity />

                <Card data-tour="manage-jobs-card" className="col-span-1 border-0 shadow-md shadow-primary/5 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold tracking-tight">{t('manageJobs')}</CardTitle>
                        <CardDescription>
                            {t('manageJobsDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary">
                            <Link href="/dashboard/posted-jobs">
                                {t('goToMyJobs')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}




