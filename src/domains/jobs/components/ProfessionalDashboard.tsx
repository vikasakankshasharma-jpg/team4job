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
import { motion } from "framer-motion";
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
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 pb-16 px-4"
        >
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-black tracking-tight md:text-4xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                    {tDash('welcomeUser', { name: user?.name || 'User' })}
                </h1>
            </div>

            {user?.roles.includes('Professional') && !isVerified && (
                <Card className="mb-10 border-none bg-warning/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-warning opacity-50 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex-row items-center gap-6 space-y-0 p-8">
                        <div className="p-4 rounded-2xl bg-warning/20 shadow-inner">
                            <ShieldCheck className="h-8 w-8 text-warning" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">{tDash('verifyProfessional')}</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium mt-1">{tDash('verifyProfessionalDesc')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <Button asChild variant="warning" className="h-12 px-8 rounded-2xl font-bold shadow-lg shadow-warning/20">
                            <Link href="/dashboard/verify-professional">
                                {tDash('verifyNow')} <ArrowRight className="ml-2 h-5 w-5" />
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

                <div className="flex flex-col gap-6">
                    <Card className="flex flex-col justify-center items-center text-center p-8 border-none bg-green-500/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] flex-1 group transition-all duration-500 hover:scale-[1.02]">
                        <div className="p-4 rounded-full bg-green-200/50 dark:bg-green-900/50 mb-4 group-hover:scale-110 transition-transform">
                            <IndianRupee className="h-10 w-10 text-green-700 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-bold tracking-widest text-green-600 dark:text-green-400 uppercase">{t('totalEarnings')}</p>
                        <h3 className="text-5xl font-black mt-2 text-green-800 dark:text-green-300">₹{totalEarnings.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-3 font-medium">{t('totalEarningsDesc')}</p>
                    </Card>

                    <Card className="flex flex-col justify-center items-center text-center p-8 border-none bg-blue-500/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem] flex-1 group transition-all duration-500 hover:scale-[1.02]">
                        <div className="p-4 rounded-full bg-blue-200/50 dark:bg-blue-900/50 mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="h-10 w-10 text-blue-700 dark:text-blue-400" />
                        </div>
                        <p className="text-sm font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">{t('projectedEarnings')}</p>
                        <h3 className="text-5xl font-black mt-2 text-blue-800 dark:text-blue-300">₹{pendingPayments.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-3 font-medium">{t('projectedEarningsDesc')}</p>
                    </Card>
                </div>
            </div>

            {/* Recommended Jobs — full-width section */}
            <div className="mt-8 mb-4">
                <RecommendedJobsList user={user!} />
            </div>

            {/* Bottom action cards — single flat grid, never nested */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Card data-tour="find-project-card" className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden group transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-black tracking-tight">{t('findNextProject')}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {t('findNextProjectDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <Button asChild className="h-12 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20">
                            <Link href="/dashboard/jobs">
                                {t('browseJobs')} <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <RecentActivity />

                <Card data-tour="manage-profile-card" className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden group transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-black tracking-tight">{tDash('manageProfile')}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {tDash('manageProfileDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <Button asChild variant="secondary" className="h-12 px-8 rounded-2xl font-bold border-2">
                            <Link href="/dashboard/profile">
                                {tDash('goToProfile')} <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}
