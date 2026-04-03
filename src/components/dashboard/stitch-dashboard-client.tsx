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

interface StitchCustomerDashboardClientProps {
  stats?: ClientStats;
  transactions?: Transaction[];
  loading?: boolean;
  quickMetrics?: any;
}

// CUSTOMER (JOB GIVER) BLENDED DASHBOARD
export function StitchCustomerDashboardClient({ stats, transactions, loading }: StitchCustomerDashboardClientProps) {
  const { user } = useUser();
  const userName = user?.name || 'Client';

  return (
    <div className="w-full">
        {/* Header & Welcome */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
            <div>
                <span className="text-primary font-bold text-xs tracking-widest uppercase mb-2 block">Client Workspace</span>
                <h2 className="text-3xl md:text-4xl font-black font-headline text-on-surface tracking-tighter leading-none">Overview</h2>
                <p className="text-on-surface-variant mt-2 max-w-md">Welcome back, {userName}. Here is what's happening with your projects.</p>
            </div>
            <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-xl border border-outline-variant/10">
                <div className="px-4 py-2 bg-surface-container-highest rounded-lg text-xs font-bold text-primary tracking-wider">WORKSPACE</div>
                <div className="flex items-center gap-2 pr-4">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-medium text-on-surface-variant">Active</span>
                </div>
            </div>
        </header>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Active Jobs</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-headline text-on-surface">{stats?.activeJobs || 0}</span>
                    <span className="text-[10px] text-green-500 font-bold ml-1">In Progress</span>
                </div>
                <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4"></div>
                </div>
            </div>
            
            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Completed Jobs</p>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-headline text-on-surface">{stats?.completedJobs || 0}</span>
                    <CheckCircle className="text-primary h-4 w-4" />
                </div>
                <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary w-1/2"></div>
                </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Total Bids Rcvd</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-headline text-on-surface">{stats?.totalBids || 0}</span>
                    <span className="text-[10px] text-blue-500 font-bold ml-1">To Review</span>
                </div>
                <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/3"></div>
                </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Open Disputes</p>
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
                        <h3 className="font-headline font-bold text-on-surface text-lg">Active Hiring Pipeline</h3>
                        <Link className="text-xs font-bold text-primary hover:underline" href="/dashboard/posted-jobs">View All Jobs</Link>
                    </div>

                    {stats?.activeJobs === 0 && stats?.totalBids === 0 ? (
                        <div className="bg-surface-container-low p-8 rounded-xl flex items-center justify-center border border-dashed border-outline-variant/30">
                            <div className="text-center w-full max-w-sm">
                                <Briefcase className="h-16 w-16 text-slate-400 mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-bold text-on-surface mb-2">No Active Jobs Yet</h4>
                                <p className="text-sm text-on-surface-variant mb-6">You haven't posted any jobs or hired professionals yet. Post your first job to see it track here.</p>
                                <Link href="/dashboard/post-job" className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:bg-primary/90 transition-colors">Post a Job Fast</Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Mock Task Card 1 */}
                            <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-secondary flex flex-col gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.1)] group hover:-translate-y-1 transition-transform">
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0 text-secondary">
                                        <Wrench className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="bg-secondary/10 text-secondary text-[9px] px-2 py-0.5 rounded font-black tracking-wider w-fit">HIRING</span>
                                            <h4 className="font-bold text-on-surface text-sm leading-tight mt-1 line-clamp-2">Industrial Air Unit Maintenance</h4>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-1 flex-1">
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">3 New Bids Received</p>
                                </div>
                                <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Review pending</span>
                                    <Link href="/dashboard/posted-jobs" className="text-[11px] text-primary font-bold hover:underline">View Bids</Link>
                                </div>
                            </div>

                            {/* Mock Task Card 2 */}
                            <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-primary flex flex-col gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.1)] group hover:-translate-y-1 transition-transform">
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded font-black tracking-wider w-fit">ACTIVE</span>
                                            <h4 className="font-bold text-on-surface text-sm leading-tight mt-1 line-clamp-2">Smart Grid Panel Setup</h4>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-1 flex-1">
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">Pro Assigned: John D.</p>
                                </div>
                                <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-2/3 rounded-full"></div>
                                    </div>
                                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider">In Progress</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Expenses Chart mock (hidden if no transactions for now) */}
                {transactions && transactions.length > 0 && (
                    <div className="bg-surface-container rounded-xl overflow-hidden mt-8 border border-outline-variant/10">
                        <div className="p-6 flex justify-between items-center border-b border-outline-variant/10 bg-surface-container-low">
                            <h3 className="font-headline font-bold text-on-surface">Recent Expenses</h3>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 rounded-md bg-primary/10 text-[10px] font-bold text-primary">WEEKLY</button>
                                <button className="px-3 py-1 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-on-surface">MONTHLY</button>
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
                        Quick Actions
                    </h3>
                    <div className="space-y-3">
                        <Link href="/wizard" className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                                <PlusCircle className="h-5 w-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">Post a New Job</p>
                                <p className="text-[10px] text-on-surface-variant truncate">Hire professional talent today</p>
                            </div>
                        </Link>
                        
                        <Link href="/dashboard/posted-jobs" className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform flex-shrink-0">
                                <Gavel className="h-5 w-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">Review Bids</p>
                                <p className="text-[10px] text-on-surface-variant truncate">Check applicants for open jobs</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/settings" className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform flex-shrink-0">
                                <Settings className="h-5 w-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">Manage Settings</p>
                                <p className="text-[10px] text-on-surface-variant truncate">Update profile and billing</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity Timeline */}
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/5 shadow-sm">
                    <h3 className="font-headline font-bold text-on-surface mb-6">Recent Activity</h3>
                    <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                        <div className="relative pl-8">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10 border-4 border-surface-container-low">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                            <p className="text-sm font-bold text-on-surface leading-tight">Account Created</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">Welcome to Team4Job</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

export default StitchCustomerDashboardClient;
