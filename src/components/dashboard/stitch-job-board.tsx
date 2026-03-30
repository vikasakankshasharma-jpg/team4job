// @ts-nocheck
'use client';
import React from 'react';

// STITCH GENERATED COMPONENT: StitchProfessionalJobBoard
// Note: Requires globals.css and stitch-colors.css
export function StitchProfessionalJobBoard() {
  return (
    <div className="font-sans selection:bg-blue-500 selection:text-white">
        
{/* TopNavBar */}
<header className="fixed top-0 w-full flex justify-between items-center px-8 h-16 bg-[#0b1326]/70 backdrop-blur-xl dark:bg-[#0b1326]/70 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
<div className="flex items-center gap-8">
<span className="text-2xl font-black tracking-tighter bg-gradient-to-br from-[#b4c5ff] to-[#2563eb] bg-clip-text text-transparent font-headline">Team4Job</span>
<nav className="hidden md:flex items-center gap-6">
<a className="text-[#b4c5ff] border-b-2 border-[#2563eb] pb-1 font-headline tracking-tighter font-bold" href="#">Browse Jobs</a>
<a className="text-[#434655] hover:text-[#b4c5ff] transition-colors font-headline tracking-tighter font-bold" href="#">My Bids</a>
<a className="text-[#434655] hover:text-[#b4c5ff] transition-colors font-headline tracking-tighter font-bold" href="#">Messages</a>
<a className="text-[#434655] hover:text-[#b4c5ff] transition-colors font-headline tracking-tighter font-bold" href="#">Analytics</a>
</nav>
</div>
<div className="flex items-center gap-4">
<button className="p-2 text-on-surface-variant hover:bg-[#222a3d] transition-all duration-200 rounded-lg">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button className="p-2 text-on-surface-variant hover:bg-[#222a3d] transition-all duration-200 rounded-lg">
<span className="material-symbols-outlined" data-icon="settings">settings</span>
</button>
<div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
<img alt="User profile" data-alt="Close up portrait of a professional male software engineer with a confident smile in a modern office setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_PPcJSJ2elOpsg1YPE8XMYcpD0oo1fcqfXDB_DtjMmTQ3t77SqaKCKXh3N40MkeWFcupw2WklUQqN0C2BOb-gHhJpRJqDsAWnsuqcrzN_dkAOhwbgqNAD7gKP6kdreLnhy-JIV3hoXUT9czIQz1VFMjBz77ArzCyvHo9DE-fMwwjj9uAQvSGD3yrnWPOtovG1O_2Ub8UsBIw40NOj5KiONypATogj4pHndSbgv6Fl9-5vUIeft9YYzc320kU2NHptc_nD4Vi23J5-" />
</div>
</div>
</header>
<div className="flex h-screen pt-16">
{/* SideNavBar */}
<aside className="hidden lg:flex flex-col h-full py-6 w-64 bg-[#171f33] dark:bg-[#171f33] border-r-0">
<div className="px-6 mb-8">
<h2 className="text-lg font-bold text-[#b4c5ff] font-headline">Freelancer Console</h2>
<p className="text-[10px] uppercase tracking-widest text-outline">Technical Division</p>
</div>
<nav className="flex-1 px-4 space-y-1">
<a className="flex items-center gap-3 px-4 py-3 bg-[#222a3d] text-[#b4c5ff] border-l-4 border-[#2563eb] transition-transform hover:translate-x-1" href="#">
<span className="material-symbols-outlined" data-icon="work">work</span>
<span className="font-medium text-sm">All Jobs</span>
</a>
<a className="flex items-center gap-3 px-4 py-3 text-[#434655] hover:bg-[#222a3d]/50 transition-transform hover:translate-x-1" href="#">
<span className="material-symbols-outlined" data-icon="bookmark">bookmark</span>
<span className="font-medium text-sm">Saved</span>
</a>
<a className="flex items-center gap-3 px-4 py-3 text-[#434655] hover:bg-[#222a3d]/50 transition-transform hover:translate-x-1" href="#">
<span className="material-symbols-outlined" data-icon="send">send</span>
<span className="font-medium text-sm">Applied</span>
</a>
<a className="flex items-center gap-3 px-4 py-3 text-[#434655] hover:bg-[#222a3d]/50 transition-transform hover:translate-x-1" href="#">
<span className="material-symbols-outlined" data-icon="forum">forum</span>
<span className="font-medium text-sm">Interviews</span>
</a>
<a className="flex items-center gap-3 px-4 py-3 text-[#434655] hover:bg-[#222a3d]/50 transition-transform hover:translate-x-1" href="#">
<span className="material-symbols-outlined" data-icon="payments">payments</span>
<span className="font-medium text-sm">Payments</span>
</a>
</nav>
<div className="px-4 mt-auto space-y-1">
<a className="flex items-center gap-3 px-4 py-2 text-[#434655] hover:bg-[#222a3d]/50 text-sm" href="#">
<span className="material-symbols-outlined text-sm" data-icon="help">help</span>
                    Support
                </a>
<a className="flex items-center gap-3 px-4 py-2 text-[#434655] hover:bg-[#222a3d]/50 text-sm" href="#">
<span className="material-symbols-outlined text-sm" data-icon="description">description</span>
                    Documentation
                </a>
<button className="w-full mt-4 py-3 rounded-lg bg-gradient-to-br from-[#b4c5ff] to-[#2563eb] text-on-primary font-bold text-sm shadow-lg active:scale-95 transition-all">
                    Post a Requirement
                </button>
</div>
</aside>
{/* Main Content Area */}
<main className="flex-1 flex flex-col min-w-0 bg-surface">
{/* Filter Bar */}
<section className="h-20 bg-surface-container border-b-0 flex items-center px-8 gap-6 z-40">
<div className="flex flex-col min-w-[140px]">
<span className="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Radius</span>
<div className="flex items-center bg-surface-container-high px-3 py-1.5 rounded-md">
<span className="text-sm font-semibold">50 km</span>
<span className="material-symbols-outlined text-sm ml-auto" data-icon="expand_more">expand_more</span>
</div>
</div>
<div className="flex flex-col min-w-[200px]">
<span className="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Certifications</span>
<div className="flex items-center bg-surface-container-high px-3 py-1.5 rounded-md">
<span className="text-sm font-semibold">Cisco, CompTIA+</span>
<span className="material-symbols-outlined text-sm ml-auto" data-icon="filter_list">filter_list</span>
</div>
</div>
<div className="flex flex-col min-w-[240px]">
<span className="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Budget Range</span>
<div className="flex items-center gap-3">
<input className="w-full accent-secondary" max="10000" min="500" step="100" type="range" />
<span className="text-xs font-mono">$5k+</span>
</div>
</div>
<div className="ml-auto flex items-center gap-2">
<span className="text-sm text-outline">Sort by:</span>
<button className="flex items-center gap-1 text-sm font-bold text-primary">
                        Highest Paid <span className="material-symbols-outlined text-sm" data-icon="swap_vert">swap_vert</span>
</button>
</div>
</section>
{/* Split View Content */}
<div className="flex flex-1 overflow-hidden">
{/* Job List (Left) */}
<section className="w-full md:w-[400px] lg:w-[450px] overflow-y-auto no-scrollbar bg-surface-container-low p-6 space-y-6">
{/* Job Card 1 (Active) */}
<div className="group cursor-pointer bg-surface-container-high p-5 rounded-lg border-l-4 border-secondary shadow-lg transform -translate-y-0.5 transition-all">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-black tracking-widest uppercase">High Priority</span>
<span className="text-sm font-mono text-secondary font-bold">$2,400</span>
</div>
<h3 className="text-lg font-bold font-headline text-on-surface mb-1">Data Center Rack Installation</h3>
<div className="flex items-center gap-2 text-outline text-xs mb-4">
<span className="material-symbols-outlined text-sm" data-icon="location_on">location_on</span>
<span>Frankfurt, DE (On-site)</span>
</div>
<div className="flex flex-wrap gap-2">
<span className="text-[10px] bg-surface-container-highest text-tertiary px-2 py-1 rounded">CCNA Required</span>
<span className="text-[10px] bg-surface-container-highest text-tertiary px-2 py-1 rounded">Hardware</span>
</div>
</div>
{/* Job Card 2 */}
<div className="group cursor-pointer bg-surface-container p-5 rounded-lg hover:bg-surface-container-high transition-all hover:-translate-y-0.5">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] bg-surface-container-highest text-outline-variant px-2 py-0.5 rounded font-black tracking-widest uppercase">New Posting</span>
<span className="text-sm font-mono text-primary font-bold">$1,150</span>
</div>
<h3 className="text-lg font-bold font-headline text-on-surface mb-1">Fiber Optic Splicing - Phase 2</h3>
<div className="flex items-center gap-2 text-outline text-xs mb-4">
<span className="material-symbols-outlined text-sm" data-icon="location_on">location_on</span>
<span>Amsterdam, NL (Field)</span>
</div>
<div className="flex flex-wrap gap-2">
<span className="text-[10px] bg-surface-container-highest text-tertiary px-2 py-1 rounded">FOA Certified</span>
</div>
</div>
{/* Job Card 3 */}
<div className="group cursor-pointer bg-surface-container p-5 rounded-lg hover:bg-surface-container-high transition-all hover:-translate-y-0.5">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] bg-surface-container-highest text-outline-variant px-2 py-0.5 rounded font-black tracking-widest uppercase">3 Bids</span>
<span className="text-sm font-mono text-primary font-bold">$4,800</span>
</div>
<h3 className="text-lg font-bold font-headline text-on-surface mb-1">Industrial IoT Gateway Mesh Setup</h3>
<div className="flex items-center gap-2 text-outline text-xs mb-4">
<span className="material-symbols-outlined text-sm" data-icon="location_on">location_on</span>
<span>Munich, DE (Industrial)</span>
</div>
<div className="flex flex-wrap gap-2">
<span className="text-[10px] bg-surface-container-highest text-tertiary px-2 py-1 rounded">AWS IoT</span>
<span className="text-[10px] bg-surface-container-highest text-tertiary px-2 py-1 rounded">MQTT</span>
</div>
</div>
{/* Job Card 4 */}
<div className="group cursor-pointer bg-surface-container p-5 rounded-lg hover:bg-surface-container-high transition-all hover:-translate-y-0.5">
<div className="flex justify-between items-start mb-2">
<span className="text-[10px] bg-surface-container-highest text-outline-variant px-2 py-0.5 rounded font-black tracking-widest uppercase">Verified</span>
<span className="text-sm font-mono text-primary font-bold">$850</span>
</div>
<h3 className="text-lg font-bold font-headline text-on-surface mb-1">Server Migration (L1 Support)</h3>
<div className="flex items-center gap-2 text-outline text-xs mb-4">
<span className="material-symbols-outlined text-sm" data-icon="location_on">location_on</span>
<span>Berlin, DE (Remote Hybrid)</span>
</div>
<div className="flex flex-wrap gap-2">
<span className="text-[10px] bg-surface-container-highest text-tertiary px-2 py-1 rounded">Linux Admin</span>
</div>
</div>
</section>
{/* Job Detail (Right) */}
<section className="hidden md:flex flex-1 flex-col overflow-y-auto no-scrollbar bg-surface border-l-0 p-10">
<div className="max-w-3xl">
<header className="mb-10">
<div className="flex items-center gap-4 mb-4">
<span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">Contract • On-site</span>
<span className="text-outline text-xs">Posted 4 hours ago</span>
</div>
<h1 className="text-4xl font-extrabold font-headline tracking-tighter mb-6 leading-tight">Data Center Rack Installation &amp; Network Pathing</h1>
<div className="grid grid-cols-3 gap-8 p-6 bg-surface-container-low rounded-xl">
<div>
<p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Estimated Budget</p>
<p className="text-2xl font-mono font-bold text-secondary">$2,400 - $3,200</p>
</div>
<div>
<p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Location</p>
<p className="text-lg font-bold">Frankfurt, DE</p>
</div>
<div>
<p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Certifications</p>
<p className="text-lg font-bold text-tertiary">CCNA / CCNP</p>
</div>
</div>
</header>
<div className="space-y-12 mb-12">
<section>
<h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="description">description</span>
                                    Project Description
                                </h3>
<p className="text-on-surface-variant leading-relaxed">
                                    We require a highly skilled network technician for the installation and configuration of 12 server racks within our Tier 3 data center in Frankfurt. The scope includes structural mounting, power distribution unit (PDU) installation, and precise cable management using pre-defined pathing schematics. 
                                </p>
</section>
<section>
<h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="settings_suggest">settings_suggest</span>
                                    Technical Requirements
                                </h3>
<ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-on-surface-variant">
<li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Expertise in CAT6A &amp; Fiber Optic pathing</li>
<li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Experience with APC and Vertiv Rack systems</li>
<li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Valid Cisco CCNA or industrial equivalent</li>
<li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Knowledge of ANSI/TIA-942 standards</li>
</ul>
</section>
{/* Bid Form */}
<section className="bg-surface-container p-8 rounded-xl border-0">
<h3 className="text-xl font-bold font-headline mb-6 text-on-surface">Submit Your Proposal</h3>
<div className="space-y-8">
<div>
<div className="flex justify-between items-end mb-4">
<label className="text-sm font-bold text-outline uppercase tracking-widest">Your Bid Amount</label>
<span className="text-3xl font-mono font-black text-secondary">$<span id="bid-value">2,850</span></span>
</div>
<div className="relative h-2 bg-surface-container-highest rounded-full overflow-hidden">
<div className="absolute h-full bg-secondary w-3/4"></div>
</div>
<div className="flex justify-between mt-2 text-[10px] font-mono text-outline">
<span>MIN $2,400</span>
<span>MAX $3,200</span>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="flex flex-col gap-2">
<label className="text-xs font-bold text-outline">Estimated Start</label>
<input className="bg-surface-container-low border-0 text-on-surface rounded-md p-3 focus:ring-2 focus:ring-primary" type="date" />
</div>
<div className="flex flex-col gap-2">
<label className="text-xs font-bold text-outline">Duration (Days)</label>
<input className="bg-surface-container-low border-0 text-on-surface rounded-md p-3 focus:ring-2 focus:ring-primary" placeholder="5" type="number" />
</div>
</div>
<div className="flex flex-col gap-2">
<label className="text-xs font-bold text-outline">Cover Letter / Technical Brief</label>
<textarea className="bg-surface-container-low border-0 text-on-surface rounded-md p-4 focus:ring-2 focus:ring-primary resize-none" placeholder="Highlight your experience with similar rack installations..." rows="4"></textarea>
</div>
<button className="w-full py-4 bg-secondary-container hover:bg-[#ff7e1a] text-white font-black text-lg uppercase tracking-widest rounded-lg shadow-xl active:scale-95 transition-all">
                                        Submit Bid
                                    </button>
<p className="text-center text-[10px] text-outline">Platform fee of 3% applies upon project successful payout.</p>
</div>
</section>
</div>
</div>
</section>
</div>
</main>
</div>
{/* BottomNavBar */}
<footer className="lg:hidden fixed bottom-0 w-full flex justify-around p-2 bg-[#0b1326]/80 backdrop-blur-xl z-50 rounded-t-lg border-t border-[#434655]/20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<a className="flex flex-col items-center justify-center bg-[#2563eb] text-white rounded-xl p-2 px-4 transition-transform active:scale-90" href="#">
<span className="material-symbols-outlined" data-icon="search">search</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">Search</span>
</a>
<a className="flex flex-col items-center justify-center text-[#434655] p-2 transition-transform active:scale-90" href="#">
<span className="material-symbols-outlined" data-icon="gavel">gavel</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">Bids</span>
</a>
<a className="flex flex-col items-center justify-center text-[#434655] p-2 transition-transform active:scale-90" href="#">
<span className="material-symbols-outlined" data-icon="mail">mail</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">Inbox</span>
</a>
<a className="flex flex-col items-center justify-center text-[#434655] p-2 transition-transform active:scale-90" href="#">
<span className="material-symbols-outlined" data-icon="person_outline">person_outline</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">Profile</span>
</a>
</footer>

    </div>
  );
}

export default StitchProfessionalJobBoard;
