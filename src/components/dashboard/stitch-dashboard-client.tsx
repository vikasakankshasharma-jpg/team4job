
'use client';
import React from 'react';
import Link from 'next/link';
import { useUser } from "@/hooks/use-user";
import { ClientStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";

interface StitchCustomerDashboardClientProps {
  stats?: ClientStats;
  transactions?: Transaction[];
  loading?: boolean;
  quickMetrics?: any;
}

// STITCH GENERATED FREELANCER DASHBOARD (Adapted for Customer)
export function StitchCustomerDashboardClient({ stats, transactions, loading }: StitchCustomerDashboardClientProps) {
  const { user } = useUser();
  const userName = user?.name || 'Client';
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
        
{/* Mobile Top Navigation (Visible on Mobile Only) */}
<nav className="md:hidden fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/30 flex justify-between items-center px-6 h-16 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
<span className="text-2xl font-black tracking-tighter text-slate-50">Team4Job</span>
<div className="flex gap-4 items-center">
<span className="material-symbols-outlined text-on-surface-variant">notifications</span>
<div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30">
<img className="w-full h-full object-cover" data-alt="professional portrait of a technical engineer in a clean blue work shirt against a neutral grey background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpWD8hbfKLmiwO00Xz9MoRCVjfz0ApZ4_5jegUhefi-cjdWCi8ljByT_mL8xV7kKuUBPniBI86F-7zKOnSixAr2Irga_q33de5Qt8GE-Dv8xxnXNrxfF0kJDSIo5npg4H01cXeaHQ6dH8zReh4PU0R8zE3DcCCrjrQA692Ayzzfx9e7xVy3SJIO2twvf3SElQdU0LMl8OTmfQoNkut-68k4eUKF7f22b1Uiumk1O325jeNvwEwCKx12enUdPK9oyFNjjWPGjBasKk" />
</div>
</div>
</nav>
{/* Desktop Sidebar Navigation */}
<aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-slate-900 dark:bg-[#131b2e] flex-col py-8 z-50 overflow-y-auto">
<div className="px-6 mb-10">
<h1 className="text-xl font-black text-blue-500 font-headline">Team4Job</h1>
<p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Freelancer Console</p>
</div>
<nav className="flex-1 space-y-1">
<a className="flex items-center gap-3 px-6 py-3 bg-blue-600/10 text-blue-500 border-r-4 border-blue-500 font-headline font-semibold tracking-wide active:translate-x-1 transition-transform" href="#">
<span className="material-symbols-outlined" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
<span>Dashboard</span>
</a>
<a className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-slate-200 font-headline font-semibold tracking-wide transition-all hover:bg-slate-800/40 active:translate-x-1" href="#">
<span className="material-symbols-outlined">work</span>
<span>Jobs</span>
</a>
<a className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-slate-200 font-headline font-semibold tracking-wide transition-all hover:bg-slate-800/40 active:translate-x-1" href="#">
<span className="material-symbols-outlined">gavel</span>
<span>Bids</span>
</a>
<a className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-slate-200 font-headline font-semibold tracking-wide transition-all hover:bg-slate-800/40 active:translate-x-1" href="#">
<span className="material-symbols-outlined">account_balance_wallet</span>
<span>Wallet</span>
</a>
</nav>
<div className="px-6 mt-auto">
<Link href="/dashboard/post-job" className="flex items-center justify-center w-full py-4 bg-gradient-to-br from-primary-container to-inverse-primary rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all">
                Post a New Job
</Link>
<div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center gap-3">
<img className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-800" data-alt="close-up of a smiling male contractor wearing industrial safety gear and a headset" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFw4dsFeZv77xYsCe_QWt-rheCuFTY484p1OwiqBAhyERiis79JOAFN9EjMb2FJwo-H2lFTkyFI58HBxQUF1LYaT-2DSxP0_Cl8arRK8FDgK4BcyRptF_fwuEkdpFw3cH9DkzCMbZbqMxcw8F4lRirZcb2ltJMTLc1AS-UOULUcdRgpgi_WZ2SvzLljIokFxB9ZrMV9xP72WJs8OADpPlBldRw1XJaA8tlHmZL31Ag798tn_Y57eEqck8BB6k8rYLNPadte9xPjxE" />
<div className="overflow-hidden">
<p className="text-sm font-bold truncate text-on-surface">{userName}</p>
<p className="text-xs text-on-surface-variant truncate">Customer Account</p>
</div>
</div>
</div>
</aside>
{/* Main Content Canvas */}
<main className="md:ml-64 min-h-screen pt-20 pb-24 md:pt-8 md:pb-8 px-4 md:px-12 blueprint-grid">
{/* Header & Welcome */}
<header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
<div>
<span className="text-secondary font-bold text-xs tracking-widest uppercase mb-2 block">System Operational</span>
<h2 className="text-4xl md:text-5xl font-black font-headline text-on-surface tracking-tighter leading-none">Console.Main()</h2>
<p className="text-on-surface-variant mt-2 max-w-md">Welcome back, {userName}. Your technical dashboard is ready.</p>
</div>
<div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-xl border border-outline-variant/10">
<div className="px-4 py-2 bg-surface-container-highest rounded-lg text-xs font-bold text-primary tracking-wider">NETWORK STATUS</div>
<div className="flex items-center gap-2 pr-4">
<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
<span className="text-xs font-medium text-on-surface-variant">Optimal</span>
</div>
</div>
</header>
{/* Stats Bento Grid */}
<section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
<div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
<p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Active Jobs</p>
<div className="flex items-baseline gap-1">
<span className="text-2xl font-black font-headline text-on-surface">{stats?.activeJobs || 0}</span>
<span className="text-[10px] text-green-400 font-bold">In Progress</span>
</div>
<div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
<div className="h-full bg-primary w-3/4"></div>
</div>
</div>
<div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
<p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Completed Jobs</p>
<div className="flex items-baseline gap-1">
<span className="text-2xl font-black font-headline text-on-surface">{stats?.completedJobs || 0}</span>
<span className="material-symbols-outlined text-primary text-sm">verified</span>
</div>
<div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
<div className="h-full bg-secondary w-1/2"></div>
</div>
</div>
<div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
<p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Total Bids Rcvd</p>
<div className="flex items-baseline gap-1">
<span className="text-2xl font-black font-headline text-on-surface">{stats?.totalBids || 0}</span>
<span className="text-[10px] text-primary-fixed-dim font-bold">In Queue</span>
</div>
<div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
<div className="h-full bg-blue-400 w-1/3"></div>
</div>
</div>
<div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-container transition-colors group">
<p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1">Open Disputes</p>
<div className="flex items-baseline gap-1">
<span className="text-2xl font-black font-headline text-on-surface">{stats?.openDisputes || 0}</span>
<span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
</div>
<div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
<div className="h-full bg-tertiary w-11/12"></div>
</div>
</div>
</section>
<div className="grid lg:grid-cols-3 gap-8">
{/* Left Column: Primary Charts & Analytics */}
<div className="lg:col-span-2 space-y-8">
{/* Earning Visualization */}
<div className="bg-surface-container rounded-xl overflow-hidden">
<div className="p-6 flex justify-between items-center border-b border-outline-variant/5">
<h3 className="font-headline font-bold text-on-surface">Revenue Projection</h3>
<div className="flex gap-2">
<button className="px-3 py-1 rounded-md bg-surface-container-highest text-[10px] font-bold text-primary">WEEKLY</button>
<button className="px-3 py-1 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-on-surface">MONTHLY</button>
</div>
</div>
<div className="p-8 aspect-[21/9] flex items-end justify-between gap-2">
{/* Custom Mock Chart using Tailwind */}
<div className="flex-1 bg-slate-800/30 rounded-t-lg h-[40%] group relative">
<div className="absolute inset-x-0 bottom-0 bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-lg h-full"></div>
<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">$1.2k</span>
</div>
<div className="flex-1 bg-slate-800/30 rounded-t-lg h-[65%] group relative">
<div className="absolute inset-x-0 bottom-0 bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-lg h-full"></div>
<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">$1.8k</span>
</div>
<div className="flex-1 bg-slate-800/30 rounded-t-lg h-[45%] group relative">
<div className="absolute inset-x-0 bottom-0 bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-lg h-full"></div>
<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">$1.4k</span>
</div>
<div className="flex-1 bg-slate-800/30 rounded-t-lg h-[90%] group relative">
<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/20 to-primary/60 transition-all rounded-t-lg h-full border-t-2 border-primary"></div>
<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary">$2.4k</span>
</div>
<div className="flex-1 bg-slate-800/30 rounded-t-lg h-[55%] group relative">
<div className="absolute inset-x-0 bottom-0 bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-lg h-full"></div>
<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">$1.6k</span>
</div>
<div className="flex-1 bg-slate-800/30 rounded-t-lg h-[30%] group relative">
<div className="absolute inset-x-0 bottom-0 bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-lg h-full"></div>
<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">$0.9k</span>
</div>
<div className="flex-1 bg-slate-800/30 rounded-t-lg h-[50%] group relative">
<div className="absolute inset-x-0 bottom-0 bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-lg h-full"></div>
<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">$1.5k</span>
</div>
</div>
</div>
{/* Active Installations */}
<div className="space-y-4">
<div className="flex justify-between items-center">
<h3 className="font-headline font-bold text-on-surface text-lg">Active Installations</h3>
<a className="text-xs font-bold text-primary hover:underline" href="#">View All Schedule</a>
</div>
<div className="grid md:grid-cols-2 gap-4">
{/* Task Card 1 */}
<div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-secondary flex gap-4 items-start group hover:bg-surface-container-high transition-all">
<div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-secondary">router</span>
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<h4 className="font-bold text-on-surface text-sm">Industrial 5G Node Deployment</h4>
<span className="bg-secondary-container/20 text-secondary text-[9px] px-2 py-1 rounded font-black">URGENT</span>
</div>
<p className="text-xs text-on-surface-variant mt-1">Tech Park Zone B, Lot 4</p>
<div className="mt-4 flex items-center justify-between">
<div className="flex -space-x-2">
<img className="w-6 h-6 rounded-full border-2 border-surface-container-low object-cover" data-alt="portrait of a professional technician in workshop gear" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtPrfaV5VXfCGxzfFF_p94pZ4HpcjSdY63WpbLFd7JI5ARH3PoDw5pGQny8r_jrP5YP27pDhmYhyRe2ZawsczpglwET0CPscYgv3asTmqTZe9e-QpvytnrIeetiLq_X3lDz971KnZaXCNuhGBGkqkI-j1fDDLSu4a_7fA4ur3dxQw2c9MoT8Jaaefcvt9c2O36rSzPLz2aWC7KjAsGHc0NTIotBZjTo4S_stR8uHkudR2xRWH108o7S64IrRH2C6xul9QMuNgdq08" />
<div className="w-6 h-6 rounded-full border-2 border-surface-container-low bg-slate-800 flex items-center justify-center text-[8px] font-bold">+3</div>
</div>
<span className="text-[10px] text-on-surface-variant font-medium">Starts in 2h 15m</span>
</div>
</div>
</div>
{/* Task Card 2 */}
<div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-primary flex gap-4 items-start group hover:bg-surface-container-high transition-all">
<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-primary">solar_power</span>
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<h4 className="font-bold text-on-surface text-sm">Smart Grid Calibration</h4>
<span className="bg-primary-container/20 text-primary text-[9px] px-2 py-1 rounded font-black">ONGOING</span>
</div>
<p className="text-xs text-on-surface-variant mt-1">Residential Sector 12</p>
<div className="mt-4 flex items-center justify-between">
<div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
<div className="h-full bg-primary w-2/3"></div>
</div>
<span className="text-[10px] text-primary font-bold">65% Complete</span>
</div>
</div>
</div>
</div>
</div>
</div>
{/* Right Column: Sidebar Actions & Profile */}
<div className="space-y-8">
{/* Quick Actions Module */}
<div className="bg-surface-container-low rounded-xl p-6">
<h3 className="font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-xl">bolt</span>
                        Quick Actions
                    </h3>
<div className="space-y-3">
<button className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined">add_circle</span>
</div>
<div className="text-left">
<p className="text-sm font-bold text-on-surface">Create Bid</p>
<p className="text-[10px] text-on-surface-variant">Find new technical projects</p>
</div>
</button>
<button className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
<div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined">receipt_long</span>
</div>
<div className="text-left">
<p className="text-sm font-bold text-on-surface">Add Invoice</p>
<p className="text-[10px] text-on-surface-variant">Submit billing for completed work</p>
</div>
</button>
<button className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group">
<div className="w-10 h-10 rounded-lg bg-slate-700/20 flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined">person</span>
</div>
<div className="text-left">
<p className="text-sm font-bold text-on-surface">View Profile</p>
<p className="text-[10px] text-on-surface-variant">Manage certification &amp; skills</p>
</div>
</button>
</div>
</div>
{/* Recent Activity / Status Conduit */}
<div className="bg-surface-container-low rounded-xl p-6">
<h3 className="font-headline font-bold text-on-surface mb-6">Certification Flow</h3>
<div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/20">
<div className="relative pl-8">
<div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
<span className="material-symbols-outlined text-[14px] text-on-primary font-black">check</span>
</div>
<p className="text-sm font-bold text-on-surface leading-tight">Safety Compliance V2</p>
<p className="text-[10px] text-on-surface-variant">Completed on Oct 12</p>
</div>
<div className="relative pl-8">
<div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
<span className="material-symbols-outlined text-[14px] text-on-primary font-black">check</span>
</div>
<p className="text-sm font-bold text-on-surface leading-tight">High-Voltage Handling</p>
<p className="text-[10px] text-on-surface-variant">Verified by Board</p>
</div>
<div className="relative pl-8">
<div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container-highest border-2 border-primary animate-pulse z-10"></div>
<p className="text-sm font-bold text-primary leading-tight">Fiber Optic Specialist</p>
<p className="text-[10px] text-on-surface-variant">Exam in Progress</p>
</div>
<div className="relative pl-8">
<div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container-highest border-2 border-outline-variant/30 z-10"></div>
<p className="text-sm font-bold text-on-surface-variant leading-tight">Master Site Manager</p>
<p className="text-[10px] text-slate-600">Unlock at Level 5</p>
</div>
</div>
</div>
</div>
</div>
</main>
{/* Mobile Bottom Navigation Shell */}
<nav className="md:hidden fixed bottom-0 w-full z-50 bg-slate-900 border-t border-slate-800/30 flex justify-around items-center h-16 pb-2 shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
<a className="flex flex-col items-center justify-center gap-1 text-blue-500" href="#">
<span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
<span className="text-[10px] font-bold">Dashboard</span>
</a>
<a className="flex flex-col items-center justify-center gap-1 text-slate-400" href="#">
<span className="material-symbols-outlined text-2xl">work</span>
<span className="text-[10px] font-bold">Jobs</span>
</a>
<div className="-mt-8">
<button className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center text-white shadow-xl shadow-secondary/30 ring-4 ring-background">
<span className="material-symbols-outlined text-3xl">add</span>
</button>
</div>
<a className="flex flex-col items-center justify-center gap-1 text-slate-400" href="#">
<span className="material-symbols-outlined text-2xl">gavel</span>
<span className="text-[10px] font-bold">Bids</span>
</a>
<a className="flex flex-col items-center justify-center gap-1 text-slate-400" href="#">
<span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
<span className="text-[10px] font-bold">Wallet</span>
</a>
</nav>

    </div>
  );
}

export default StitchCustomerDashboardClient;
