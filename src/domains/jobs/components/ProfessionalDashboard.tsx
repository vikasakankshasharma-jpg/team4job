"use client";

import React, { useMemo, useEffect } from "react";
import { JobsMetricsRow } from "./JobsMetricsRow"
import { RecommendedJobsList } from "./RecommendedJobsList"
import { useUser } from "@/hooks/use-user"
import { useFirebase } from "@/infrastructure/firebase/client-provider"
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowRight,
    ShieldCheck,
    Briefcase,
    Target,
    UserCheck,
    IndianRupee,
    Clock
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import { toDate } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/dashboard/cards/stat-card";

import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { ProfessionalStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";
import { TRANSACTION_STATUS } from "@/lib/constants/statuses";

const ProfessionalEarningsChart = dynamic(() => import("@/components/dashboard/charts/professional-earnings-chart").then(mod => mod.ProfessionalEarningsChart), { ssr: false });

export function ProfessionalDashboard({ stats, transactions, loading = false }: {
    stats: ProfessionalStats,
    transactions: Transaction[],
    loading?: boolean
}) {
    const { user } = useUser();
    const { setHelp } = useHelp();
    const t = useTranslations('Professional.dashboard');
    const tDash = useTranslations('dashboard');

    const isVerified = user?.professionalProfile?.verified;

    // Process Data for Earnings Chart (Last 6 Months - Released Only)
    const earningsData = useMemo(() => {
        const months = Array.from({ length: 6 }).map((_, i) => {
            const d = subMonths(new Date(), i);
            return {
                name: format(d, 'MMM'),
                fullName: format(d, 'MMM yyyy'),
                amount: 0,
                date: d
            };
        }).reverse();

        transactions.forEach(t => {
            if (t.status === TRANSACTION_STATUS.RELEASED && t.releasedAt) {
                const date = toDate(t.releasedAt);
                const monthStr = format(date, 'MMM yyyy');
                const monthData = months.find(m => m.fullName === monthStr);
                if (monthData) {
                    monthData.amount += t.payoutToProfessional || 0;
                }
            }
        });
        return months;
    }, [transactions]);

    const totalEarnings = transactions
        .filter(t => t.status === TRANSACTION_STATUS.RELEASED)
        .reduce((acc, t) => acc + (t.payoutToProfessional || 0), 0);

    const pendingPayments = transactions
        .filter(t => t.status === TRANSACTION_STATUS.FUNDED)
        .reduce((acc, t) => acc + (t.payoutToProfessional || 0), 0);


    useEffect(() => {
        setHelp({
            title: t('guide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('guide.welcome')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">{t('guide.openJobsLabel')}</span> {t('guide.openJobsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.myBidsLabel')}</span> {t('guide.myBidsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.jobsWonLabel')}</span> {t('guide.jobsWonDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.projectedEarningsLabel')}</span> {t('guide.projectedEarningsDesc')}
                        </li>
                        {!isVerified && (
                            <li>
                                <span className="font-semibold">{t('guide.verificationLabel')}</span> {t('guide.verificationDesc')}
                            </li>
                        )}
                        <li>
                            <span className="font-semibold">{t('guide.findProjectLabel')}</span> {t('guide.findProjectDesc')}
                        </li>
                    </ul>
                    <p>{t('guide.bottomText')}</p>
                </div>
            )
        });
    }, [setHelp, t, isVerified]);

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <>
            <div className="flex items-center mb-8">
                <h1 className="text-lg font-semibold md:text-2xl">{tDash('welcomeUser', { name: user?.name || 'User' })}</h1>
            </div>
            {user?.roles.includes('Professional') && !isVerified && (
                <Card className="mb-8 border-warning/50 bg-warning/5 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-warning" />
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                        <div className="p-3 rounded-xl bg-warning/10">
                            <ShieldCheck className="h-6 w-6 text-warning" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">{tDash('verifyProfessional')}</CardTitle>
                            <CardDescription className="text-muted-foreground">{tDash('verifyProfessionalDesc')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="warning" size="sm" className="font-semibold shadow-sm">
                            <Link href="/dashboard/verify-professional">
                                {tDash('verifyNow')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title={t('openJobs')}
                    value={stats.openJobs}
                    description={t('openJobsDesc')}
                    icon={Briefcase}
                    href="/dashboard/jobs"
                    iconBgColor="bg-primary/10"
                    iconColor="text-primary"
                />
                <StatCard
                    title={t('myBids')}
                    value={stats.myBids}
                    description={t('myBidsDesc')}
                    icon={Target}
                    href="/dashboard/my-bids"
                    iconBgColor="bg-primary/10"
                    iconColor="text-primary"
                />
                <StatCard
                    title={t('jobsWon')}
                    value={stats.jobsWon}
                    description={t('jobsWonDesc')}
                    icon={UserCheck}
                    href="/dashboard/my-bids?status=Awarded"
                    iconBgColor="bg-success/10"
                    iconColor="text-success"
                />
            </div>

            {/* Earnings Chart Section */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
                <ProfessionalEarningsChart data={earningsData} />

                <div className="flex flex-col gap-4">
                    <Card className="flex flex-col justify-center items-center text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border-0 shadow-sm shadow-green-500/10 hover:shadow-md transition-shadow flex-1 group">
                        <div className="p-4 rounded-full bg-green-200/50 dark:bg-green-900/50 mb-4 group-hover:scale-110 transition-transform">
                            <IndianRupee className="h-8 w-8 text-green-700 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-semibold tracking-tight text-green-600 dark:text-green-400">{t('totalEarnings')}</p>
                        <h3 className="text-4xl font-extrabold mt-2 text-green-800 dark:text-green-300">₹{totalEarnings.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-2">{t('totalEarningsDesc')}</p>
                    </Card>

                    <Card className="flex flex-col justify-center items-center text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 border-0 shadow-sm shadow-blue-500/10 hover:shadow-md transition-shadow flex-1 group">
                        <div className="p-4 rounded-full bg-blue-200/50 dark:bg-blue-900/50 mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                        </div>
                        <p className="text-sm font-semibold tracking-tight text-blue-600 dark:text-blue-400">{t('projectedEarnings')}</p>
                        <h3 className="text-4xl font-extrabold mt-2 text-blue-800 dark:text-blue-300">₹{pendingPayments.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-2">{t('projectedEarningsDesc')}</p>
                    </Card>
                </div>
            </div>

            {/* Recommended Jobs — full-width section */}
            <div className="mt-8 mb-4">
                <RecommendedJobsList user={user!} />
            </div>

            {/* Bottom action cards — single flat grid, never nested */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card data-tour="find-project-card" className="border-0 shadow-md shadow-primary/5 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold tracking-tight">{t('findNextProject')}</CardTitle>
                        <CardDescription>
                            {t('findNextProjectDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/jobs">
                                {t('browseJobs')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <RecentActivity />

                <Card data-tour="manage-profile-card" className="border-0 shadow-md shadow-primary/5 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold tracking-tight">{tDash('manageProfile')}</CardTitle>
                        <CardDescription>
                            {tDash('manageProfileDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary">
                            <Link href="/dashboard/profile">
                                {tDash('goToProfile')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
