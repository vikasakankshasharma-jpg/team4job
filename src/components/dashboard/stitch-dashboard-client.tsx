'use client';
import React from 'react';
import Link from 'next/link';
import { useUser } from "@/hooks/use-user";
import { ClientStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";
import { 
    CheckCircle, 
    Gavel, 
    Briefcase, 
    Wrench, 
    Zap, 
    PlusCircle, 
    Settings, 
    Check 
} from "lucide-react";

import { useTranslations } from 'next-intl';

interface StitchCustomerDashboardClientProps {
  stats?: ClientStats;
  transactions?: Transaction[];
  loading?: boolean;
  quickMetrics?: any;
}

// CUSTOMER (JOB GIVER) BLENDED DASHBOARD
export function StitchCustomerDashboardClient({ stats, transactions, loading }: StitchCustomerDashboardClientProps) {
  const { user } = useUser();
  const t = useTranslations('client.dashboard');
  const userName = user?.name || 'Client';

  return (
    <div className="w-full">
        {/* Header & Welcome */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
            <div>
                <span className="text-primary font-bold text-xs tracking-widest uppercase mb-2 block">{t('workspace')}</span>
                <h2 className="text-3xl md:text-4xl font-black font-headline text-on-surface tracking-tighter leading-none">{t('overview')}</h2>
                <p className="text-on-surface-variant mt-2 max-w-md">{t('welcome', { name: userName })}</p>
            </div>
            <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-xl border border-outline-variant/10">
                <div className="px-4 py-2 bg-surface-container-highest rounded-lg text-xs font-bold text-primary tracking-wider uppercase">{t('workspace')}</div>
                <div className="flex items-center gap-2 pr-4">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-medium text-on-surface-variant">{t('active')}</span>
                </div>
            </div>
        </header>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">{t('activeJobs')}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-headline text-on-surface">{stats?.activeJobs || 0}</span>
                    <span className="text-[10px] text-green-500 font-bold ml-1">{t('inProgress')}</span>
                </div>
                <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4"></div>
                </div>
            </div>
            
            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">{t('completedJobs')}</p>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-headline text-on-surface">{stats?.completedJobs || 0}</span>
                    <CheckCircle className="text-primary h-4 w-4" />
                </div>
                <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary w-1/2"></div>
                </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">{t('totalBidsRcvd')}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-headline text-on-surface">{stats?.totalBids || 0}</span>
                    <span className="text-[10px] text-blue-500 font-bold ml-1">{t('toReview')}</span>
                </div>
                <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/3"></div>
                </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">{t('openDisputes')}</p>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-headline text-on-surface">{stats?.openDisputes || 0}</span>
                    <Gavel className="text-secondary h-4 w-4" />
                </div>
                <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 w-11/12"></div>
                </div>
            </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Primary Charts & Analytics */}
            <div className="lg:col-span-2 space-y-8">
                {/* Active Hiring Pipeline */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-surface-container-low px-4 py-2 rounded-t-xl mb-4 border-b border-outline-variant/10">
                        <h3 className="font-headline font-bold text-on-surface text-lg">{t('hiringPipeline')}</h3>
                        <Link className="text-xs font-bold text-primary hover:underline" href="/dashboard/posted-jobs">{t('viewAllJobs')}</Link>
                    </div>

                    {(!stats || stats.activeJobs === 0) ? (
                        <div className="bg-surface-container-low p-8 rounded-xl flex items-center justify-center border border-dashed border-outline-variant/30">
                            <div className="text-center w-full max-w-sm">
                                <Briefcase className="h-16 w-16 text-slate-400 mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-bold text-on-surface mb-2">{t('noActiveJobs')}</h4>
                                <p className="text-sm text-on-surface-variant mb-6">{t('noActiveJobsDesc')}</p>
                                <Link href="/wizard" className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:bg-primary/90 transition-colors">{t('postJobFast')}</Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* In a real scenario, we would map over actual active jobs here */}
                            {/* For the Beta, we show the real count above and details in the list view */}
                            <div className="col-span-full bg-surface-container-low p-6 rounded-xl text-center border border-outline-variant/10">
                                <p className="text-sm text-on-surface-variant">{t('manageJobsDesc')}</p>
                                <Link href="/dashboard/posted-jobs" className="mt-4 inline-block text-primary font-bold hover:underline italic tracking-tighter uppercase text-xs">{t('goToMyJobs')}</Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Expenses Chart mock (hidden if no transactions for now) */}
                {transactions && transactions.length > 0 && (
                    <div className="bg-surface-container rounded-xl overflow-hidden mt-8 border border-outline-variant/10">
                        <div className="p-6 flex justify-between items-center border-b border-outline-variant/10 bg-surface-container-low">
                            <h3 className="font-headline font-bold text-on-surface">{t('recentExpenses')}</h3>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 rounded-md bg-primary/10 text-[10px] font-bold text-primary tracking-widest">{t('weekly')}</button>
                                <button className="px-3 py-1 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-on-surface tracking-widest">{t('monthly')}</button>
                            </div>
                        </div>
                        <div className="p-8 aspect-[21/9] flex items-end justify-between gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-800/50 rounded-t-lg h-[40%] group relative" />
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Sidebar Actions & Profile */}
            <div className="space-y-8">
                {/* Quick Actions Module */}
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/5 shadow-sm">
                    <h3 className="font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        {t('quickActions')}
                    </h3>
                    <div className="space-y-3">
                        <Link href="/wizard" className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                                <PlusCircle className="h-5 w-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">{t('postNewJob')}</p>
                                <p className="text-[10px] text-on-surface-variant truncate">{t('postNewJobDesc')}</p>
                            </div>
                        </Link>
                        
                        <Link href="/dashboard/posted-jobs" className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform flex-shrink-0">
                                <Gavel className="h-5 w-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">{t('reviewBids')}</p>
                                <p className="text-[10px] text-on-surface-variant truncate">{t('reviewBidsDesc')}</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/settings" className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform flex-shrink-0">
                                <Settings className="h-5 w-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">{t('manageSettings')}</p>
                                <p className="text-[10px] text-on-surface-variant truncate">{t('manageSettingsDesc')}</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity Timeline */}
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/5 shadow-sm">
                    <h3 className="font-headline font-bold text-on-surface mb-6">{t('recentActivity')}</h3>
                    <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                        <div className="relative pl-8">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10 border-4 border-surface-container-low">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                            <p className="text-sm font-bold text-on-surface leading-tight">{t('accountCreated')}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">{t('welcomeToPlatform')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

export default StitchCustomerDashboardClient;
