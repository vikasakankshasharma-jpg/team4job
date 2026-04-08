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
    Award, 
    Sparkles, 
    Zap, 
    TrendingUp, 
    ShieldCheck, 
    ArrowRight, 
    Briefcase, 
    Target, 
    UserCheck, 
    IndianRupee, 
    Clock,
    User2,
    Calendar
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import { toDate } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/cards/stat-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ReputationPointCard } from "@/components/dashboard/cards/reputation-point-card";
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
    const t = useTranslations('professional.dashboard');
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
                <div className="space-y-4 text-sm font-medium">
                    <p>{t('guide.welcome')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-black uppercase text-[10px] tracking-widest">{t('guide.openJobsLabel')}</span> {t('guide.openJobsDesc')}
                        </li>
                        <li>
                            <span className="font-black uppercase text-[10px] tracking-widest">{t('guide.myBidsLabel')}</span> {t('guide.myBidsDesc')}
                        </li>
                        <li>
                            <span className="font-black uppercase text-[10px] tracking-widest">{t('guide.jobsWonLabel')}</span> {t('guide.jobsWonDesc')}
                        </li>
                        <li>
                            <span className="font-black uppercase text-[10px] tracking-widest">{t('guide.projectedEarningsLabel')}</span> {t('guide.projectedEarningsDesc')}
                        </li>
                        {!isVerified && (
                            <li>
                                <span className="font-black uppercase text-[10px] tracking-widest">{t('guide.verificationLabel')}</span> {t('guide.verificationDesc')}
                            </li>
                        )}
                    </ul>
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
            className="space-y-12 pb-16 px-4"
        >
            {/* Top Gradient Accent */}
            <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x rounded-full opacity-50 mb-4" />

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div className="space-y-2">
                    <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.5em] bg-primary/10 backdrop-blur-3xl italic">
                        COMMANDER // ACTIVE PRODUCTION HUB
                    </Badge>
                    <h1 className="text-6xl sm:text-7xl md:text-8xl font-black italic tracking-tighter uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-[0.85] mb-4">
                        {tDash('welcomeUser', { name: user?.name || 'User' })}
                    </h1>
                    <div className="flex items-center gap-3 text-muted-foreground font-medium text-lg italic opacity-70 decoration-primary/20 underline underline-offset-8">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Ready to accelerate production.
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-surface-container-low/60 backdrop-blur-xl p-3 px-6 rounded-[2rem] border border-outline-variant/10 shadow-2xl shadow-primary/5">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                    <span className="text-xs font-black uppercase tracking-widest text-primary italic">ONLINE</span>
                    <div className="h-4 w-[1px] bg-outline-variant/20 mx-2" />
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Series 4.0 // Pro Suite</div>
                </div>
            </header>

            {user?.roles.includes('Professional') && !isVerified && (
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="mb-12"
                >
                <Card className="border-none bg-warning/5 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden relative group ring-1 ring-warning/20">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-warning to-transparent opacity-30" />
                    <CardHeader className="flex-row items-center gap-8 space-y-0 p-12">
                        <div className="p-6 rounded-[2rem] bg-warning/10 shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 relative overflow-hidden">
                            <div className="absolute inset-0 bg-warning/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <ShieldCheck className="h-12 w-12 text-warning relative z-10" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase text-warning leading-none mb-2">{tDash('verifyProfessional')}</CardTitle>
                            <CardDescription className="text-lg text-muted-foreground font-medium leading-relaxed opacity-60 italic">{tDash('verifyProfessionalDesc')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="px-12 pb-12">
                        <Button asChild variant="warning" className="h-16 px-12 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-warning/20 hover:shadow-warning/40 transition-all italic">
                            <Link href="/dashboard/verify-professional" className="flex items-center">
                                {tDash('verifyNow')} <ArrowRight className="ml-4 h-6 w-6" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                </motion.div>
            )}

            <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <ReputationPointCard 
                    points={user?.professionalProfile?.points || 0}
                    tier={user?.professionalProfile?.tier || 'Bronze'}
                    history={user?.professionalProfile?.reputationHistory}
                />
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
            </section>

            {/* Earnings Chart Section */}
            <section className="mt-12 grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2">
                    <ProfessionalEarningsChart data={earningsData} />
                </div>

                <div className="flex flex-col gap-8">
                    <motion.div whileHover={{ y: -5 }} className="h-full">
                        <Card className="flex flex-col justify-center items-center text-center p-12 border-none bg-success/5 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[3rem] relative overflow-hidden group ring-1 ring-white/5 shadow-inner h-full">
                            <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12 group-hover:scale-[2] transition-transform duration-1000">
                                <TrendingUp className="h-32 w-32 text-success" />
                            </div>
                            <div className="p-8 rounded-full bg-success/10 mb-8 group-hover:scale-110 transition-transform shadow-inner relative">
                                <div className="absolute inset-0 bg-success/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <IndianRupee className="h-14 w-14 text-success relative z-10" />
                            </div>
                            <p className="text-[10px] font-black tracking-[0.4em] text-success uppercase italic opacity-40 mb-2">{t('totalEarnings')}</p>
                            <h3 className="text-7xl font-black italic tracking-tighter text-on-surface leading-none">₹{totalEarnings.toLocaleString()}</h3>
                            <p className="text-[10px] text-muted-foreground/40 mt-6 font-black uppercase tracking-[0.2em] italic">{t('totalEarningsDesc')}</p>
                        </Card>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className="h-full">
                        <Card className="flex flex-col justify-center items-center text-center p-12 border-none bg-primary/5 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[3rem] relative overflow-hidden group ring-1 ring-white/5 shadow-inner h-full">
                            <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12 group-hover:scale-[2] transition-transform duration-1000">
                                <Clock className="h-32 w-32 text-primary" />
                            </div>
                            <div className="p-8 rounded-full bg-primary/10 mb-8 group-hover:scale-110 transition-transform shadow-inner relative">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Zap className="h-14 w-14 text-primary relative z-10" />
                            </div>
                            <p className="text-[10px] font-black tracking-[0.4em] text-primary uppercase italic opacity-40 mb-2">{t('projectedEarnings')}</p>
                            <h3 className="text-7xl font-black italic tracking-tighter text-on-surface leading-none">₹{pendingPayments.toLocaleString()}</h3>
                            <p className="text-[10px] text-muted-foreground/40 mt-6 font-black uppercase tracking-[0.2em] italic">{t('projectedEarningsDesc')}</p>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Recommended Jobs */}
            <section className="mt-12">
                <RecommendedJobsList user={user!} />
            </section>

            {/* Bottom action cards */}
            <section className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
                <Card data-tour="find-project-card" className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden group ring-1 ring-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-transparent opacity-30" />
                    <CardHeader className="p-12 pb-6">
                        <div className="flex items-center gap-6 mb-4">
                            <div className="p-5 rounded-[1.25rem] bg-primary/10 text-primary shadow-inner group-hover:scale-110 transition-transform">
                                <Briefcase className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase leading-none">{t('findNextProject')}</CardTitle>
                        </div>
                        <CardDescription className="text-lg font-medium opacity-60 leading-relaxed italic">
                            {t('findNextProjectDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-12 pb-12">
                        <Button asChild className="h-16 px-12 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all italic">
                            <Link href="/dashboard/jobs">
                                {t('browseJobs')} <ArrowRight className="ml-4 h-6 w-6 transition-transform group-hover:translate-x-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <RecentActivity />

                <Card data-tour="manage-profile-card" className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden group ring-1 ring-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-accent to-transparent opacity-30" />
                    <CardHeader className="p-12 pb-6">
                        <div className="flex items-center gap-6 mb-4">
                            <div className="p-5 rounded-[1.25rem] bg-accent/10 text-accent shadow-inner group-hover:scale-110 transition-transform">
                                <User2 className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase leading-none">{tDash('manageProfile')}</CardTitle>
                        </div>
                        <CardDescription className="text-lg font-medium opacity-60 leading-relaxed italic">
                            {tDash('manageProfileDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-12 pb-12">
                        <Button asChild variant="outline" className="h-16 px-12 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] border-primary/20 hover:bg-primary/5 transition-all shadow-xl italic">
                            <Link href="/dashboard/profile">
                                {tDash('goToProfile')} <ArrowRight className="ml-4 h-6 w-6 transition-transform group-hover:translate-x-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </motion.div>
    );
}
