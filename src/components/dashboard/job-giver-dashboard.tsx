"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { RecommendedInstallersCard } from "@/components/dashboard/recommended-installers-card";
import { SpendingInsightsCard } from "@/components/dashboard/spending-insights-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { JobGiverStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";
import { TRANSACTION_STATUS } from "@/lib/constants/statuses";

const SpendingHistoryChart = dynamic(() => import("@/components/dashboard/charts/job-giver-charts").then(mod => mod.SpendingHistoryChart), { ssr: false });
const JobStatusChart = dynamic(() => import("@/components/dashboard/charts/job-giver-charts").then(mod => mod.JobStatusChart), { ssr: false });

export function JobGiverDashboard({ stats, transactions, loading = false, quickMetrics }: {
    stats: JobGiverStats,
    transactions: Transaction[],
    loading?: boolean,
    quickMetrics?: any
}) {
    const { user } = useUser();
    const { setHelp } = useHelp();
    const t = useTranslations('dashboard');
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
                    monthData.amount += t.totalPaidByGiver || 0;
                }
            }
        });

        const totalSpent = txList
            .filter(t => t.status === TRANSACTION_STATUS.RELEASED)
            .reduce((acc, t) => acc + (t.totalPaidByGiver || 0), 0);

        const fundsInEscrow = txList
            .filter(t => t.status === TRANSACTION_STATUS.FUNDED)
            .reduce((acc, t) => acc + (t.totalPaidByGiver || 0), 0);

        const jobStatusData = [
            { name: 'Active', value: stats.activeJobs, color: '#0088FE' }, // Blue
            { name: 'Completed', value: stats.completedJobs, color: '#00C49F' }, // Green
            { name: 'Cancelled', value: stats.cancelledJobs, color: '#FF8042' } // Orange
        ].filter(d => d.value > 0);

        return { spendingData: months, jobStatusData, totalSpent, fundsInEscrow };
    }, [stats, transactions]);

    useEffect(() => {
        setHelp({
            title: t('jobGiverGuide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('jobGiverGuide.welcome')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">{t('jobGiverGuide.activeJobsLabel')}</span> {t('jobGiverGuide.activeJobsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('jobGiverGuide.fundsEscrowLabel')}</span> {t('jobGiverGuide.fundsInEscrowDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('jobGiverGuide.totalBidsLabel')}</span> {t('jobGiverGuide.totalBidsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('jobGiverGuide.completedJobsLabel')}</span> {t('jobGiverGuide.completedJobsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('jobGiverGuide.needInstallerLabel')}</span> {t('jobGiverGuide.needInstallerDesc')}
                        </li>
                    </ul>
                    <p>{t('jobGiverGuide.bottomText')}</p>
                </div>
            )
        });
    }, [setHelp, t]);

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <>
            <div className="flex items-center mb-8">
                <h1 className="text-lg font-semibold md:text-2xl">{t('welcomeUser', { name: user?.name || 'User' })}</h1>
            </div>
            <div className="mb-6">
                <ActionRequiredDashboard />
            </div>

            {/* Phase 11: Quick Metrics Row */}
            {user && <DashboardMetrics userId={user.id} user={user} metrics={quickMetrics} />}

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <StatCard
                    title={t('activeJobs')}
                    value={stats.activeJobs}
                    description={t('activeJobsDesc')}
                    icon={Briefcase}
                    href="/dashboard/posted-jobs"
                    iconBgColor="bg-blue-100 dark:bg-blue-900"
                    iconColor="text-blue-600 dark:text-blue-300"
                />
                <StatCard
                    title={t('fundsInEscrow')}
                    value={`₹${fundsInEscrow.toLocaleString()}`}
                    description={t('fundsInEscrowDesc')}
                    icon={ShieldCheck}
                    href="/dashboard/posted-jobs"
                    iconBgColor="bg-encrow-100 dark:bg-indigo-900"
                    iconColor="text-indigo-600 dark:text-indigo-300"
                />
                <StatCard
                    title={t('completedJobs')}
                    value={stats.completedJobs}
                    description={t('completedJobsDesc')}
                    icon={UserCheck}
                    href="/dashboard/posted-jobs?tab=archived"
                    iconBgColor="bg-green-100 dark:bg-green-900"
                    iconColor="text-green-600 dark:text-green-300"
                />
                <StatCard
                    title={t('openDisputes')}
                    value={stats.openDisputes}
                    description={t('openDisputesDesc')}
                    icon={AlertOctagon}
                    href="/dashboard/disputes"
                    iconBgColor="bg-red-100 dark:bg-red-900"
                    iconColor="text-red-600 dark:text-red-300"
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
                    {user && <RecommendedInstallersCard userId={user.id} currentUser={user} />}
                    {user && <SpendingInsightsCard userId={user.id} />}
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card data-tour="need-installer-card" className="col-span-1">
                    <CardHeader>
                        <CardTitle>{t('needInstaller')}</CardTitle>
                        <CardDescription>
                            {t('needInstallerDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/post-job">
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('postNewJob')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <RecentActivity />

                <Card data-tour="manage-jobs-card" className="col-span-1">
                    <CardHeader>
                        <CardTitle>{t('manageJobs')}</CardTitle>
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
