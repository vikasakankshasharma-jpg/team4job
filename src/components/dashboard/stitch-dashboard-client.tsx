'use client';
import React from 'react';
import Link from 'next/link';
import { useUser } from "@/hooks/use-user";
import { ClientStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";
import { 
    Check, 
    Sparkles,
    Award,
    TrendingUp,
    Search,
    Briefcase,
    CheckCircle,
    Gavel,
    Zap,
    PlusCircle
} from "lucide-react";
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-10 pb-12"
    >
        {/* Top Gradient Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x rounded-full opacity-50 mb-8" />

        {/* Header & Welcome */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div className="space-y-2">
                <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.5em] bg-primary/10 backdrop-blur-3xl italic">
                    {t('workspace')} {/* ACTIVE COMMAND HUB */}
                </Badge>
                <h2 className="text-6xl sm:text-7xl md:text-8xl font-black italic tracking-tighter uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-[0.85] mb-4">
                    {t('overview')}
                </h2>
                <div className="flex items-center gap-3 text-muted-foreground font-medium text-lg italic opacity-80 decoration-primary/20 underline underline-offset-8">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('welcome', { name: userName })}
                </div>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low/60 backdrop-blur-xl p-3 px-6 rounded-[2rem] border border-outline-variant/10 shadow-2xl shadow-primary/5 group">
                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                <span className="text-xs font-black uppercase tracking-widest text-primary italic">{t('active')}</span>
                <div className="h-4 w-[1px] bg-outline-variant/20 mx-2" />
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Series 4.0 // Production Hub</div>
            </div>
        </header>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <motion.div 
                whileHover={{ y: -5 }}
                className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden group ring-1 ring-white/5"
            >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-700">
                    <Briefcase className="h-16 w-16 text-primary" />
                </div>
                <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase mb-2 italic opacity-40">{t('activeJobs')}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-6xl font-black italic tracking-tighter text-on-surface leading-none">{stats?.activeJobs || 0}</span>
                </div>
                <div className="mt-8 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        className="h-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.6)]" 
                    />
                </div>
            </motion.div>
            
            <motion.div 
                whileHover={{ y: -5 }}
                className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden group ring-1 ring-white/5"
            >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-700">
                    <CheckCircle className="h-16 w-16 text-success" />
                </div>
                <p className="text-[10px] font-black text-success tracking-[0.4em] uppercase mb-2 italic opacity-40">{t('completedJobs')}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-6xl font-black italic tracking-tighter text-on-surface leading-none">{stats?.completedJobs || 0}</span>
                </div>
                <div className="mt-8 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "50%" }}
                        className="h-full bg-success shadow-[0_0_20px_rgba(var(--success),0.6)]" 
                    />
                </div>
            </motion.div>

            <motion.div 
                whileHover={{ y: -5 }}
                className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden group ring-1 ring-white/5"
            >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-700">
                    <TrendingUp className="h-16 w-16 text-blue-500" />
                </div>
                <p className="text-[10px] font-black text-blue-400 tracking-[0.4em] uppercase mb-2 italic opacity-40">{t('totalBidsRcvd')}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-6xl font-black italic tracking-tighter text-on-surface leading-none">{stats?.totalBids || 0}</span>
                </div>
                <div className="mt-8 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "33%" }}
                        className="h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]" 
                    />
                </div>
            </motion.div>

            <motion.div 
                whileHover={{ y: -5 }}
                className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden group ring-1 ring-white/5"
            >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-700">
                    <TrendingUp className="h-16 w-16 text-warning" />
                </div>
                <p className="text-[10px] font-black text-warning tracking-[0.4em] uppercase mb-2 italic opacity-40">Total Spent</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-6xl font-black italic tracking-tighter text-on-surface leading-none">$4.2K</span>
                </div>
                <div className="mt-8 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "90%" }}
                        className="h-full bg-warning shadow-[0_0_20px_rgba(234,179,8,0.6)]" 
                    />
                </div>
            </motion.div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Primary Actions & Engagements */}
            <div className="lg:col-span-2 space-y-8">
                {/* Massive Primary CTA */}
                <div className="bg-gradient-primary rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 text-center text-primary-foreground shadow-[0_40px_100px_rgba(var(--primary),0.3)] hover:scale-[1.02] transition-transform duration-500 ring-1 ring-white/10 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="relative z-10 space-y-6">
                        <h3 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                            Ready to build?
                        </h3>
                        <p className="text-sm font-black uppercase tracking-[0.2em] opacity-80 italic max-w-md mx-auto">
                            Post your next project and get matched with top-tier professionals instantly.
                        </p>
                        <Button asChild size="lg" variant="secondary" className="mt-8 h-16 px-12 rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] italic text-primary shadow-2xl hover:shadow-primary/50 transition-all">
                            <Link href="/wizard">
                                <PlusCircle className="mr-3 h-6 w-6" />
                                {t('postNewJob')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Active Engagements Split View */}
                <div className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-8 border-b border-outline-variant/10 bg-muted/10">
                        <div className="flex items-center gap-4">
                            <Briefcase className="h-6 w-6 text-primary" />
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase">Active Engagements</h3>
                        </div>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Pane: Professional List */}
                        <div className="w-1/3 border-r border-outline-variant/10 overflow-y-auto bg-muted/5">
                            {stats?.activeJobs === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <p className="text-[10px] font-black uppercase tracking-widest italic opacity-60">No active professionals</p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-2">
                                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm">Alex M.</span>
                                            <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Working</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/20 border border-transparent cursor-pointer hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm text-muted-foreground">Sarah J.</span>
                                            <span className="h-2 w-2 rounded-full bg-warning"></span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Review</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Right Pane: Context/Chat */}
                        <div className="w-2/3 p-8 flex flex-col items-center justify-center bg-gradient-to-br from-transparent to-muted/10 text-center">
                            {stats?.activeJobs === 0 ? (
                                <>
                                    <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                                        <Sparkles className="h-10 w-10 text-muted-foreground opacity-50" />
                                    </div>
                                    <h4 className="text-xl font-black italic tracking-tighter uppercase text-muted-foreground mb-2">Workspace Empty</h4>
                                    <p className="text-xs font-medium text-muted-foreground opacity-60">Select an active engagement to view details or chat.</p>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col">
                                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm italic">
                                        [ Communication Interface Active ]
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-end">
                                        <Button className="rounded-full px-8 text-xs font-bold uppercase tracking-widest">
                                            Approve Milestone
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Sidebar Actions & Profile */}
            <div className="space-y-8">
                {/* Quick Actions Module */}
                <div className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5 relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 p-10 opacity-5 scale-150 -rotate-12 group-hover:scale-[2] transition-transform duration-1000">
                        <Award className="h-32 w-32 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-10 flex items-center gap-4">
                        <Zap className="h-6 w-6 text-primary animate-pulse" />
                        {t('quickActions')}
                    </h3>
                    <div className="space-y-4">
                        <Link href="/wizard" className="w-full flex items-center gap-5 p-4 rounded-[1.5rem] bg-muted/30 hover:bg-primary/10 transition-all group/action border border-white/5 shadow-inner">
                            <div className="w-12 h-12 rounded-[1rem] bg-primary/10 flex items-center justify-center text-primary group-hover/action:scale-110 group-hover/action:bg-primary group-hover/action:text-white transition-all duration-300 flex-shrink-0 shadow-lg shadow-primary/10">
                                <PlusCircle className="h-6 w-6" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-base font-black italic tracking-tighter uppercase text-on-surface leading-none mb-1">{t('postNewJob')}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">{t('postNewJobDesc')}</p>
                            </div>
                        </Link>
                        
                        <Link href="/dashboard/posted-jobs" className="w-full flex items-center gap-5 p-4 rounded-[1.5rem] bg-muted/30 hover:bg-secondary/10 transition-all group/action border border-white/5 shadow-inner">
                            <div className="w-12 h-12 rounded-[1rem] bg-secondary/10 flex items-center justify-center text-secondary group-hover/action:scale-110 group-hover/action:bg-secondary group-hover/action:text-white transition-all duration-300 flex-shrink-0 shadow-lg shadow-secondary/10">
                                <Gavel className="h-6 w-6" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-base font-black italic tracking-tighter uppercase text-on-surface leading-none mb-1">{t('reviewBids')}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">{t('reviewBidsDesc')}</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity Timeline */}
                <div className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-10">{t('recentActivity')}</h3>
                    <div className="relative space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[1px] before:bg-primary/20 before:shadow-[0_0_8px_rgba(var(--primary),0.3)]">
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10 border-4 border-surface-container-low shadow-lg shadow-primary/20">
                                <Check className="h-4 w-4 text-white font-black" />
                            </div>
                            <p className="text-base font-black italic tracking-tighter uppercase text-on-surface leading-tight">{t('accountCreated')}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 italic opacity-60">{t('welcomeToPlatform')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
  );
}

export default StitchCustomerDashboardClient;
