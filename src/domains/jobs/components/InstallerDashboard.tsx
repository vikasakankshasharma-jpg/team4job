"use client";

import React, { useMemo, useEffect } from "react";
import { JobsMetricsRow } from "./JobsMetricsRow"
import { RecommendedJobsList } from "./RecommendedJobsList"
import { useUser, useFirebase } from "@/hooks/use-user"
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
import { InstallerStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";
import { TRANSACTION_STATUS } from "@/lib/constants/statuses";

const InstallerEarningsChart = dynamic(() => import("@/components/dashboard/charts/installer-earnings-chart").then(mod => mod.InstallerEarningsChart), { ssr: false });

export function InstallerDashboard({ stats, transactions, loading = false }: {
    stats: InstallerStats,
    transactions: Transaction[],
    loading?: boolean
}) {
    const { user } = useUser();
    const { setHelp } = useHelp();
    const t = useTranslations('dashboard');

    const isVerified = user?.installerProfile?.verified;

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
                    monthData.amount += t.payoutToInstaller || 0;
                }
            }
        });
        return months;
    }, [transactions]);

    const totalEarnings = transactions
        .filter(t => t.status === TRANSACTION_STATUS.RELEASED)
        .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);

    const pendingPayments = transactions
        .filter(t => t.status === TRANSACTION_STATUS.FUNDED)
        .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);


    useEffect(() => {
        setHelp({
            title: t('installerGuide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('installerGuide.welcome')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">{t('installerGuide.openJobsLabel')}</span> {t('installerGuide.openJobsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('installerGuide.myBidsLabel')}</span> {t('installerGuide.myBidsDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('installerGuide.jobsWonLabel')}</span> {t('installerGuide.jobsWonDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('installerGuide.projectedEarningsLabel')}</span> {t('installerGuide.projectedEarningsDesc')}
                        </li>
                        {!isVerified && (
                            <li>
                                <span className="font-semibold">{t('installerGuide.verificationLabel')}</span> {t('installerGuide.verificationDesc')}
                            </li>
                        )}
                        <li>
                            <span className="font-semibold">{t('installerGuide.findProjectLabel')}</span> {t('installerGuide.findProjectDesc')}
                        </li>
                    </ul>
                    <p>{t('installerGuide.bottomText')}</p>
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
                <h1 className="text-lg font-semibold md:text-2xl">{t('welcomeUser', { name: user?.name || 'User' })}</h1>
            </div>
            {user?.roles.includes('Installer') && !isVerified && (
                <Card className="mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                        <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                            <ShieldCheck className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                        </div>
                        <div>
                            <CardTitle>{t('verifyInstaller')}</CardTitle>
                            <CardDescription>{t('verifyInstallerDesc')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/verify-installer">
                                {t('verifyNow')} <ArrowRight className="ml-2 h-4 w-4" />
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
                    iconBgColor="bg-blue-100 dark:bg-blue-900"
                    iconColor="text-blue-600 dark:text-blue-300"
                />
                <StatCard
                    title={t('myBids')}
                    value={stats.myBids}
                    description={t('myBidsDesc')}
                    icon={Target}
                    href="/dashboard/my-bids"
                    iconBgColor="bg-purple-100 dark:bg-purple-900"
                    iconColor="text-purple-600 dark:text-purple-300"
                />
                <StatCard
                    title={t('jobsWon')}
                    value={stats.jobsWon}
                    description={t('jobsWonDesc')}
                    icon={UserCheck}
                    href="/dashboard/my-bids?status=Awarded"
                    iconBgColor="bg-green-100 dark:bg-green-900"
                    iconColor="text-green-600 dark:text-green-300"
                />
            </div>

            {/* Earnings Chart Section */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
                <InstallerEarningsChart data={earningsData} />

                <div className="flex flex-col gap-4">
                    <Card className="flex flex-col justify-center items-center text-center p-6 bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900 flex-1">
                        <div className="p-4 rounded-full bg-green-200 dark:bg-green-900 mb-4">
                            <IndianRupee className="h-8 w-8 text-green-700 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('totalEarnings')}</p>
                        <h3 className="text-4xl font-bold mt-2 text-green-800 dark:text-green-300">₹{totalEarnings.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-2">{t('totalEarningsDesc')}</p>
                    </Card>

                    <Card className="flex flex-col justify-center items-center text-center p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 flex-1">
                        <div className="p-4 rounded-full bg-blue-200 dark:bg-blue-900 mb-4">
                            <Clock className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                        </div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('projectedEarnings')}</p>
                        <h3 className="text-4xl font-bold mt-2 text-blue-800 dark:text-blue-300">₹{pendingPayments.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-2">{t('projectedEarningsDesc')}</p>
                    </Card>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                <div className="mt-8 mb-8">
                    <RecommendedJobsList user={user!} />
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card data-tour="find-project-card">
                        <CardHeader>
                            <CardTitle>{t('findNextProject')}</CardTitle>
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

                    <Card data-tour="manage-profile-card">
                        <CardHeader>
                            <CardTitle>{t('manageProfile')}</CardTitle>
                            <CardDescription>
                                {t('manageProfileDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="secondary">
                                <Link href="/dashboard/profile">
                                    {t('goToProfile')} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
