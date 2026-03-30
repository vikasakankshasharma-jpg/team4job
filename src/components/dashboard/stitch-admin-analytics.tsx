// @ts-nocheck
'use client';
import React from 'react';

// STITCH GENERATED COMPONENT: StitchAdminAnalytics
// Note: Requires globals.css and stitch-colors.css
export function StitchAdminAnalytics() {
  return (
    <div className="font-sans selection:bg-blue-500 selection:text-white">
        
{/* TopNavBar */}
<header className="bg-[#131b2e] dark:bg-[#131b2e] flex justify-between items-center w-full px-6 py-2 h-14 docked full-width top-0 z-50 fixed shadow-sm shadow-blue-900/10">
<div className="flex items-center gap-8">
<span className="text-xl font-black text-slate-100 tracking-tighter font-headline">Team4Job</span>
<div className="hidden md:flex items-center gap-4">
<div className="relative group">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
<input className="bg-[#171f33] border-none text-xs py-1.5 pl-9 pr-4 w-64 rounded-md focus:ring-1 focus:ring-primary-container text-on-surface-variant placeholder:text-slate-500" placeholder="Search system logs..." type="text" />
</div>
</div>
</div>
<div className="flex items-center gap-4">
<button className="text-slate-400 hover:bg-[#171f33] p-1.5 rounded transition-colors duration-150">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button className="text-slate-400 hover:bg-[#171f33] p-1.5 rounded transition-colors duration-150">
<span className="material-symbols-outlined" data-icon="settings">settings</span>
</button>
<button className="text-slate-400 hover:bg-[#171f33] p-1.5 rounded transition-colors duration-150">
<span className="material-symbols-outlined" data-icon="help_outline">help_outline</span>
</button>
<div className="h-8 w-8 rounded-full overflow-hidden bg-surface-container-highest border border-outline-variant/20">
<img alt="Admin Avatar" className="w-full h-full object-cover" data-alt="close-up portrait of professional software architect with glasses in a dark moody office with blue computer screen lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAo0ZXVjK4jS3frKv2jlLWs4Uuc546rwgUaKWlQJhC6QcYEEWJpkUMLInvMnmaZwmP88SPtT3fNCRCObhdu7R65Lep0PHWguYLVQNuflmyQXB2wGWDdTNLj5ezdIyd2KaChE6SIeV1FDmKyGlhDGZXlElO-R3QCMdeDM_kGmRgoqDF_kQD7G-fsZ1XBWbo9HpviSACZQBjNh8Qfd1wvhPtuBNlqnMTE7vie0d1oIlzr0FP7tTiRQp_SLObON0Km1YYXEUsp9WxZr5ok" />
</div>
</div>
</header>
{/* SideNavBar */}
<aside className="bg-[#0b1326] dark:bg-[#0b1326] flex flex-col h-screen fixed left-0 top-0 pt-16 pb-4 px-3 w-64 no-border font-label">
<div className="mb-8 px-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded-lg shadow-lg shadow-primary/20">
<span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>architecture</span>
</div>
<div>
<h3 className="text-on-surface font-bold text-sm tracking-tight">System Architect</h3>
<p className="text-[10px] text-slate-500 font-mono">V2.4.0-Stable</p>
</div>
</div>
</div>
<nav className="flex-1 space-y-1">
<a className="text-blue-400 bg-[#171f33] border-r-2 border-blue-500 flex items-center gap-3 px-4 py-2.5 rounded-l-md text-xs font-medium transition-all group" href="#">
<span className="material-symbols-outlined group-hover:translate-x-1 duration-200" data-icon="dashboard">dashboard</span>
<span>Overview</span>
</a>
<a className="text-slate-500 hover:text-slate-300 hover:bg-[#131b2e] flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-medium transition-all group" href="#">
<span className="material-symbols-outlined group-hover:translate-x-1 duration-200" data-icon="storefront">storefront</span>
<span>Marketplace</span>
</a>
<a className="text-slate-500 hover:text-slate-300 hover:bg-[#131b2e] flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-medium transition-all group" href="#">
<span className="material-symbols-outlined group-hover:translate-x-1 duration-200" data-icon="payments">payments</span>
<span>Financials</span>
</a>
<a className="text-slate-500 hover:text-slate-300 hover:bg-[#131b2e] flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-medium transition-all group" href="#">
<span className="material-symbols-outlined group-hover:translate-x-1 duration-200" data-icon="construction">construction</span>
<span>Admin Tools</span>
</a>
</nav>
<div className="mt-auto pt-4 border-t border-slate-800/30">
<a className="text-slate-500 hover:text-red-400 hover:bg-red-900/10 flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-medium transition-all group" href="#">
<span className="material-symbols-outlined group-hover:translate-x-1 duration-200" data-icon="logout">logout</span>
<span>Logout</span>
</a>
</div>
</aside>
{/* Main Content Canvas */}
<main className="ml-64 pt-14 min-h-screen p-6 bg-background space-y-6">
{/* Dashboard Header */}
<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div>
<p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold mb-1">Terminal Control</p>
<h1 className="text-2xl font-black font-headline text-on-surface tracking-tight">Platform Admin Analytics</h1>
</div>
<div className="flex items-center bg-surface-container-low p-1 rounded-lg">
<button className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-on-surface transition-colors">24H</button>
<button className="px-3 py-1.5 text-[10px] font-bold bg-primary-container text-on-primary-container rounded shadow-sm">7D</button>
<button className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-on-surface transition-colors">30D</button>
<button className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-on-surface transition-colors">1Y</button>
</div>
</div>
{/* KPI Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
<div className="bg-surface-container p-4 rounded shadow-sm relative overflow-hidden group">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Growth Rate</span>
<span className="material-symbols-outlined text-primary text-lg" data-icon="trending_up">trending_up</span>
</div>
<div className="flex items-baseline gap-2">
<h2 className="text-2xl font-black font-headline text-on-surface">+12.4%</h2>
<span className="text-[10px] text-primary font-bold">vs last week</span>
</div>
<div className="absolute bottom-0 left-0 w-full h-1 bg-primary-container/20">
<div className="bg-primary h-full w-[70%]"></div>
</div>
</div>
<div className="bg-surface-container p-4 rounded shadow-sm relative overflow-hidden group">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Escrow Volume</span>
<span className="material-symbols-outlined text-secondary text-lg" data-icon="account_balance_wallet">account_balance_wallet</span>
</div>
<div className="flex items-baseline gap-2">
<h2 className="text-2xl font-black font-headline text-on-surface">$2.4M</h2>
<span className="text-[10px] text-slate-500 font-bold">Total locked</span>
</div>
<div className="absolute bottom-0 left-0 w-full h-1 bg-secondary-container/20">
<div className="bg-secondary h-full w-[45%]"></div>
</div>
</div>
<div className="bg-surface-container p-4 rounded shadow-sm relative overflow-hidden group">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Pending Verifications</span>
<span className="material-symbols-outlined text-tertiary text-lg" data-icon="verified_user">verified_user</span>
</div>
<div className="flex items-baseline gap-2">
<h2 className="text-2xl font-black font-headline text-on-surface">148</h2>
<span className="text-[10px] text-tertiary font-bold">Action required</span>
</div>
<div className="absolute bottom-0 left-0 w-full h-1 bg-tertiary-container/20">
<div className="bg-tertiary h-full w-[85%]"></div>
</div>
</div>
<div className="bg-surface-container p-4 rounded shadow-sm relative overflow-hidden group">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Open Disputes</span>
<span className="material-symbols-outlined text-error text-lg" data-icon="gavel">gavel</span>
</div>
<div className="flex items-baseline gap-2">
<h2 className="text-2xl font-black font-headline text-on-surface">24</h2>
<span className="text-[10px] text-error font-bold">Critical urgency</span>
</div>
<div className="absolute bottom-0 left-0 w-full h-1 bg-error-container/20">
<div className="bg-error h-full w-[30%]"></div>
</div>
</div>
</div>
{/* Main Chart & Recent Disputes Sidebar */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
{/* Large Chart Section */}
<div className="lg:col-span-8 bg-surface-container p-6 rounded-lg space-y-6">
<div className="flex justify-between items-center">
<h3 className="font-headline font-bold text-sm tracking-tight flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-primary"></span>
                        Platform Revenue &amp; Volume
                    </h3>
<div className="flex items-center gap-4">
<div className="flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="text-[10px] font-bold text-slate-400">REVENUE</span>
</div>
<div className="flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-secondary"></span>
<span className="text-[10px] font-bold text-slate-400">VOLUME</span>
</div>
</div>
</div>
<div className="aspect-[16/7] w-full relative group">
{/* Visual representation of an area chart */}
<div className="absolute inset-0 flex items-end justify-between gap-1">
<div className="bg-primary/20 hover:bg-primary/40 transition-colors w-full" style="height: 40%"></div>
<div className="bg-primary/20 hover:bg-primary/40 transition-colors w-full" style="height: 65%"></div>
<div className="bg-primary/20 hover:bg-primary/40 transition-colors w-full" style="height: 55%"></div>
<div className="bg-primary/20 hover:bg-primary/40 transition-colors w-full" style="height: 80%"></div>
<div className="bg-primary/20 hover:bg-primary/40 transition-colors w-full" style="height: 70%"></div>
<div className="bg-primary/20 hover:bg-primary/40 transition-colors w-full" style="height: 95%"></div>
<div className="bg-primary/20 hover:bg-primary/40 transition-colors w-full" style="height: 85%"></div>
</div>
<div className="absolute inset-0 flex items-end justify-between gap-1 pointer-events-none">
<div className="bg-secondary/40 w-full" style="height: 20%"></div>
<div className="bg-secondary/40 w-full" style="height: 35%"></div>
<div className="bg-secondary/40 w-full" style="height: 30%"></div>
<div className="bg-secondary/40 w-full" style="height: 50%"></div>
<div className="bg-secondary/40 w-full" style="height: 40%"></div>
<div className="bg-secondary/40 w-full" style="height: 65%"></div>
<div className="bg-secondary/40 w-full" style="height: 60%"></div>
</div>
{/* Chart Axes */}
<div className="absolute bottom-0 left-0 w-full h-px bg-slate-800"></div>
<div className="absolute bottom-0 left-0 h-full w-px bg-slate-800"></div>
</div>
<div className="flex justify-between text-[10px] font-mono text-slate-600 px-2 uppercase tracking-tighter">
<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
</div>
</div>
{/* Recent Disputes Feed */}
<div className="lg:col-span-4 bg-surface-container-low rounded-lg flex flex-col">
<div className="p-4 border-b border-slate-800/30 flex justify-between items-center">
<h3 className="font-headline font-bold text-sm tracking-tight text-error">Recent Disputes</h3>
<span className="text-[10px] bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-bold">URGENT</span>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4">
{/* Dispute Card */}
<div className="bg-surface-container p-3 rounded border-l-2 border-error hover:bg-surface-container-high transition-colors cursor-pointer">
<div className="flex justify-between items-start mb-1">
<span className="text-[10px] font-bold text-on-surface">ID: #DS-8902</span>
<span className="text-[9px] font-mono text-slate-500">2m ago</span>
</div>
<p className="text-[11px] font-medium leading-relaxed mb-2">Escrow release blocked for "Network Upgrade" project. Professional claims completion.</p>
<div className="flex items-center gap-2">
<div className="w-4 h-4 rounded-full bg-slate-700"></div>
<span className="text-[10px] text-slate-400 italic">User: AlphaLabs</span>
</div>
</div>
{/* Dispute Card */}
<div className="bg-surface-container p-3 rounded border-l-2 border-tertiary hover:bg-surface-container-high transition-colors cursor-pointer">
<div className="flex justify-between items-start mb-1">
<span className="text-[10px] font-bold text-on-surface">ID: #DS-8891</span>
<span className="text-[9px] font-mono text-slate-500">14m ago</span>
</div>
<p className="text-[11px] font-medium leading-relaxed mb-2">Partial payment dispute: Milestone 4 vs Milestone 5 deliverables mismatch.</p>
<div className="flex items-center gap-2">
<div className="w-4 h-4 rounded-full bg-slate-700"></div>
<span className="text-[10px] text-slate-400 italic">User: QuantumDev</span>
</div>
</div>
</div>
<button className="w-full py-3 text-[10px] font-bold text-primary uppercase tracking-[0.2em] border-t border-slate-800/30 hover:bg-primary/5 transition-colors">
                    View All Incidents
                </button>
</div>
</div>
{/* Heatmap Section */}
<div className="bg-surface-container p-6 rounded-lg">
<div className="flex justify-between items-center mb-6">
<h3 className="font-headline font-bold text-sm tracking-tight">Active Hub Concentration</h3>
<div className="text-[10px] text-slate-500 font-mono">LIVE_FEED: GLOBAL_NODES</div>
</div>
<div className="grid grid-cols-12 gap-2">
{/* Mock Map Representation */}
<div className="col-span-12 lg:col-span-8 bg-surface-container-lowest h-64 rounded-lg relative overflow-hidden">
<div className="absolute inset-0 opacity-20 grayscale" data-alt="minimalist technical world map with glowing blue dots at major tech hub locations like San Francisco, London, and Singapore" data-location="Global" style="background-image: url('https://placeholder.pics/svg/300'); background-size: cover;"></div>
{/* Pulse Pings */}
<div className="absolute top-[30%] left-[20%] w-3 h-3 bg-primary rounded-full animate-ping"></div>
<div className="absolute top-[40%] left-[45%] w-2 h-2 bg-secondary rounded-full"></div>
<div className="absolute top-[60%] left-[70%] w-4 h-4 bg-primary rounded-full animate-pulse"></div>
<div className="absolute top-[25%] left-[85%] w-2 h-2 bg-primary rounded-full"></div>
</div>
<div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-2">
<div className="bg-surface-container-high p-4 rounded-lg flex flex-col justify-center items-center text-center">
<span className="text-[10px] text-slate-400 font-bold mb-1">NORTH AMERICA</span>
<span className="text-xl font-black text-on-surface">4,209</span>
</div>
<div className="bg-surface-container-high p-4 rounded-lg flex flex-col justify-center items-center text-center border border-primary/10">
<span className="text-[10px] text-primary font-bold mb-1">EUROPE (DACH)</span>
<span className="text-xl font-black text-on-surface">8,112</span>
</div>
<div className="bg-surface-container-high p-4 rounded-lg flex flex-col justify-center items-center text-center">
<span className="text-[10px] text-slate-400 font-bold mb-1">ASIA PACIFIC</span>
<span className="text-xl font-black text-on-surface">2,554</span>
</div>
<div className="bg-surface-container-high p-4 rounded-lg flex flex-col justify-center items-center text-center">
<span className="text-[10px] text-slate-400 font-bold mb-1">LATAM</span>
<span className="text-xl font-black text-on-surface">1,098</span>
</div>
</div>
</div>
</div>
{/* Data Table Section */}
<div className="bg-surface-container rounded-lg overflow-hidden">
<div className="p-4 bg-surface-container-low flex justify-between items-center">
<h3 className="font-headline font-bold text-sm tracking-tight">Pending Professional Verifications</h3>
<div className="flex gap-2">
<button className="px-3 py-1 bg-surface-container-highest text-[10px] font-bold rounded hover:bg-primary-container transition-colors">Export CSV</button>
<button className="px-3 py-1 bg-surface-container-highest text-[10px] font-bold rounded hover:bg-primary-container transition-colors">Bulk Action</button>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low/50">
<th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Name</th>
<th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Certification Tier</th>
<th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Compliance Status</th>
<th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Submission Date</th>
<th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
</tr>
</thead>
<tbody className="text-xs">
<tr className="hover:bg-surface-container-high/50 transition-colors border-b border-slate-800/10">
<td className="px-6 py-4">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-primary">EK</div>
<div>
<p className="font-bold text-on-surface">Elias Kaelin</p>
<p className="text-[10px] text-slate-500">Infrastructure Security</p>
</div>
</div>
</td>
<td className="px-6 py-4">
<span className="bg-primary-container/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">L3 SENIOR</span>
</td>
<td className="px-6 py-4">
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
<span className="text-slate-300">Background Pending</span>
</div>
</td>
<td className="px-6 py-4 font-mono text-[10px] text-slate-500">2024-05-12 14:22</td>
<td className="px-6 py-4 text-right space-x-2">
<button className="text-primary hover:bg-primary/10 px-2 py-1 rounded font-bold uppercase text-[9px]">Approve</button>
<button className="text-error hover:bg-error/10 px-2 py-1 rounded font-bold uppercase text-[9px]">Reject</button>
</td>
</tr>
<tr className="bg-surface-container-lowest/30 hover:bg-surface-container-high/50 transition-colors border-b border-slate-800/10">
<td className="px-6 py-4">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-secondary">AM</div>
<div>
<p className="font-bold text-on-surface">Amara Miller</p>
<p className="text-[10px] text-slate-500">Fullstack Engineer</p>
</div>
</div>
</td>
<td className="px-6 py-4">
<span className="bg-secondary-container/10 text-secondary px-2 py-0.5 rounded text-[10px] font-bold">L1 ASSOCIATE</span>
</td>
<td className="px-6 py-4">
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="text-slate-300">Identity Confirmed</span>
</div>
</td>
<td className="px-6 py-4 font-mono text-[10px] text-slate-500">2024-05-12 11:05</td>
<td className="px-6 py-4 text-right space-x-2">
<button className="text-primary hover:bg-primary/10 px-2 py-1 rounded font-bold uppercase text-[9px]">Approve</button>
<button className="text-error hover:bg-error/10 px-2 py-1 rounded font-bold uppercase text-[9px]">Reject</button>
</td>
</tr>
<tr className="hover:bg-surface-container-high/50 transition-colors border-b border-slate-800/10">
<td className="px-6 py-4">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-tertiary">JD</div>
<div>
<p className="font-bold text-on-surface">Jaxon Drake</p>
<p className="text-[10px] text-slate-500">Data Architect</p>
</div>
</div>
</td>
<td className="px-6 py-4">
<span className="bg-primary-container/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">L3 SENIOR</span>
</td>
<td className="px-6 py-4">
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-error"></span>
<span className="text-error">Missing Docs</span>
</div>
</td>
<td className="px-6 py-4 font-mono text-[10px] text-slate-500">2024-05-11 18:40</td>
<td className="px-6 py-4 text-right space-x-2">
<button className="text-primary hover:bg-primary/10 px-2 py-1 rounded font-bold uppercase text-[9px]">Approve</button>
<button className="text-error hover:bg-error/10 px-2 py-1 rounded font-bold uppercase text-[9px]">Reject</button>
</td>
</tr>
</tbody>
</table>
</div>
<div className="p-3 bg-surface-container-low flex justify-center">
<button className="text-[10px] font-bold text-slate-500 hover:text-on-surface transition-colors flex items-center gap-2">
                    LOAD MORE RECORDS
                    <span className="material-symbols-outlined text-sm">expand_more</span>
</button>
</div>
</div>
</main>
{/* Footer */}
<footer className="bg-[#060e20] dark:bg-[#060e20] flex justify-between items-center px-8 py-3 w-full ml-64 border-t border-slate-800/30 fixed bottom-0 z-40">
<div className="flex gap-6 items-center">
<span className="text-slate-600 font-label text-[10px] uppercase tracking-widest">© 2024 Team4Job Admin Terminal. System Status: <span className="text-primary">Operational.</span></span>
</div>
<div className="flex gap-6 items-center">
<a className="text-slate-600 hover:text-blue-300 underline underline-offset-4 font-label text-[10px] uppercase tracking-widest transition-opacity opacity-80 hover:opacity-100" href="#">Technical Standards</a>
<a className="text-slate-600 hover:text-blue-300 underline underline-offset-4 font-label text-[10px] uppercase tracking-widest transition-opacity opacity-80 hover:opacity-100" href="#">API Docs</a>
<a className="text-slate-600 hover:text-blue-300 underline underline-offset-4 font-label text-[10px] uppercase tracking-widest transition-opacity opacity-80 hover:opacity-100" href="#">Privacy Policy</a>
</div>
</footer>

    </div>
  );
}

export default StitchAdminAnalytics;
