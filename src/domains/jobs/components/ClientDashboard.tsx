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
import { motion } from "framer-motion";
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
    const hasDashboardActivity = stats.activeJobs > 0 || stats.completedJobs > 0 || stats.cancelledJobs > 0 || stats.totalBids > 0 || stats.openDisputes > 0 || transactions.length > 0;

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
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 pb-16 px-4"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                        {tDash('welcomeUser', { name: user?.name || 'User' })}
                    </h1>
                    <p className="text-muted-foreground font-medium mt-2 text-lg">{t('dashboardDesc')}</p>
                </div>
                <div className="flex gap-4">
                     <Button asChild size="lg" className="rounded-2xl font-bold shadow-xl shadow-primary/20 h-14 px-8">
                        <Link href="/wizard">
                            <PlusCircle className="mr-2 h-6 w-6" /> {t('postNewJob')}
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="mb-6">
                <ActionRequiredDashboard />
            </div>

            {/* Phase 11: Quick Metrics Row */}
            {user && <DashboardMetrics userId={user.id} user={user} metrics={quickMetrics} />}

            {!hasDashboardActivity && (
                <Card className="mb-10 border-none bg-card/20 backdrop-blur-xl shadow-2xl rounded-[3rem] overflow-hidden group">
                    <CardHeader className="p-10">
                        <CardTitle className="text-3xl font-black tracking-tight">Welcome to your elite dashboard</CardTitle>
                        <CardDescription className="text-lg font-medium mt-3">
                            You don&apos;t have any job activity yet. Post your first job to start seeing dashboard metrics, charts, and recent activity.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 pb-10">
                        <Button asChild size="lg" className="rounded-2xl font-black h-14 px-10 shadow-2xl">
                            <Link href="/wizard">
                                <PlusCircle className="mr-3 h-6 w-6" /> {t('postNewJob')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

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

            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Card data-tour="need-Professional-card" className="col-span-1 border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden group transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-black tracking-tight">{t('needProfessional')}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {t('needProfessionalDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <Button asChild className="h-12 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20">
                            <Link href="/wizard">
                                <PlusCircle className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" /> {t('postNewJob')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <RecentActivity />

                <Card data-tour="manage-jobs-card" className="col-span-1 border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden group transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-black tracking-tight">{t('manageJobs')}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {t('manageJobsDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <Button asChild variant="secondary" className="h-12 px-8 rounded-2xl font-bold border-2">
                            <Link href="/dashboard/posted-jobs">
                                {t('goToMyJobs')} <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}




