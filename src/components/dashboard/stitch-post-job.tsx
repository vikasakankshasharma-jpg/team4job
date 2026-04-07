// @ts-nocheck
'use client';
import React from 'react';
import Image from 'next/image';

// STITCH GENERATED COMPONENT: StitchPostJobClient
// Note: Requires globals.css and stitch-colors.css
export function StitchPostJobClient() {
  return (
    <div className="font-sans selection:bg-blue-500 selection:text-white">
        
{/* TopAppBar */}
<header className="fixed top-0 left-0 right-0 z-50 bg-surface dark:bg-slate-900 border-none">
<div className="flex justify-between items-center w-full px-8 h-16 max-w-7xl mx-auto">
<div className="text-xl font-black tracking-tighter text-on-surface dark:text-slate-100">Team4Job</div>
<nav className="hidden md:flex items-center gap-8">
<a className="font-medium Inter text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 transition-colors" href="#">Dashboard</a>
<a className="font-medium Inter text-primary dark:text-blue-400 border-b-2 border-primary dark:border-blue-400 pb-1" href="#">Jobs</a>
<a className="font-medium Inter text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 transition-colors" href="#">Teams</a>
<a className="font-medium Inter text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 transition-colors" href="#">Reports</a>
</nav>
<div className="flex items-center gap-4">
<button className="material-symbols-outlined text-on-surface-variant dark:text-slate-400 hover:text-primary transition-colors">notifications</button>
<button className="material-symbols-outlined text-on-surface-variant dark:text-slate-400 hover:text-primary transition-colors">settings</button>
<div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest">
<Image alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCu5mG0UHlzjgrqfJWmqcjGiFbRrBx2nVAbFnTDCJhp9ci8zgeuzgGJhhfosRewLwRvXZ_YysvfQdLcL6939zPnUTIXGVgTT1t96l8klECQdfGXOv5PNolbM_gKojopg5B0OwtEXxCiLl6l_umWhFnlcWiQxTGzvIgE27z4M369O2djAi9GN9r19yaid8m9AxumQjTgAOm0Uq3Ia-aCv6OWWFBc9sFgDqdVGdyZKGjQrH-4XaS7AMAViSId7Qy9tAweGAZB0zi0_64a" width={32} height={32} unoptimized />
</div>
</div>
</div>
</header>
{/* SideNavBar (Hidden on desktop for this specific Wizard flow to maximize focus) */}
<aside className="hidden lg:flex flex-col h-full py-6 px-4 fixed left-0 top-16 w-64 bg-surface dark:bg-slate-900 border-r border-transparent">
<div className="flex items-center gap-3 mb-8 px-2">
<div className="w-10 h-10 bg-primary dark:bg-blue-600 rounded-lg flex items-center justify-center text-white">
<span className="material-symbols-outlined">construction</span>
</div>
<div>
<p className="text-lg font-black text-primary dark:text-blue-400">Project Wizard</p>
<p className="text-[10px] uppercase tracking-wide text-on-surface-variant dark:text-slate-500 font-bold">Technical Installation</p>
</div>
</div>
<div className="space-y-1">
<div className="flex items-center gap-3 px-3 py-2 bg-surface-container-highest dark:bg-slate-800 text-primary dark:text-blue-400 font-bold rounded-lg transition-all scale-[0.98] duration-150">
<span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
<span className="uppercase tracking-wide text-[11px] Inter">Overview</span>
</div>
<div className="flex items-center gap-3 px-3 py-2 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all">
<span className="material-symbols-outlined" data-icon="work">work</span>
<span className="uppercase tracking-wide text-[11px] Inter">Active Jobs</span>
</div>
<div className="flex items-center gap-3 px-3 py-2 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all">
<span className="material-symbols-outlined" data-icon="edit_note">edit_note</span>
<span className="uppercase tracking-wide text-[11px] Inter">Drafts</span>
</div>
</div>
<button className="mt-auto mx-2 py-3 bg-primary dark:bg-blue-600 text-on-primary rounded-lg font-bold text-sm tracking-tight flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-sm">add</span>
            New Installation
        </button>
</aside>
{/* Main Content */}
<main className="pt-24 pb-16 px-4 md:px-8 lg:ml-64 max-w-6xl mx-auto">
{/* Multi-Step Progress Indicator */}
<div className="mb-12 max-w-3xl">
<div className="flex justify-between items-end mb-4">
<div>
<span className="text-[10px] font-bold tracking-widest text-primary dark:text-blue-400 uppercase">Step 01/04</span>
<h1 className="text-3xl font-extrabold tracking-tight text-on-surface dark:text-slate-100">Create New Job</h1>
</div>
</div>
<div className="flex gap-2 h-1.5 w-full">
<div className="h-full flex-1 bg-primary dark:bg-blue-500 rounded-full"></div>
<div className="h-full flex-1 bg-surface-container-high dark:bg-slate-800 rounded-full"></div>
<div className="h-full flex-1 bg-surface-container-high dark:bg-slate-800 rounded-full"></div>
<div className="h-full flex-1 bg-surface-container-high dark:bg-slate-800 rounded-full"></div>
</div>
<div className="flex justify-between mt-3">
<span className="text-[11px] font-bold uppercase tracking-wider text-primary dark:text-blue-400">Basic Info</span>
<span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/40 dark:text-slate-600">Technical Scope</span>
<span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/40 dark:text-slate-600">Budget</span>
<span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/40 dark:text-slate-600">Review</span>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
{/* Left Column: Form */}
<div className="lg:col-span-7 space-y-8">
{/* Section: Job Essentials */}
<section className="p-8 bg-surface-container-lowest dark:bg-slate-900 rounded-xl shadow-[0_20px_50px_rgba(19,27,46,0.04)]">
<h2 className="text-xl font-bold mb-6 text-on-surface dark:text-slate-100 flex items-center gap-2">
<span className="material-symbols-outlined text-primary dark:text-blue-400">info</span>
                        Basic Information
                    </h2>
<div className="space-y-6">
<div className="relative">
<label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400 mb-2 block">Job Title</label>
<input className="w-full bg-surface-container-lowest dark:bg-slate-800 border-none px-0 py-3 text-lg font-medium focus:ring-0 peer transition-all" placeholder="e.g. Rack Server Installation - Data Center A" type="text" />
<div className="h-0.5 w-0 bg-primary dark:bg-blue-400 transition-all duration-300 peer-focus:w-full"></div>
<div className="h-[1px] w-full bg-outline-variant/30 dark:bg-slate-700"></div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div>
<label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400 mb-2 block">Device Count</label>
<div className="flex items-center bg-surface-container-low dark:bg-slate-800 rounded-lg p-1">
<button className="w-10 h-10 flex items-center justify-center text-primary dark:text-blue-400 hover:bg-surface-container-highest dark:hover:bg-slate-700 rounded transition-colors">
<span className="material-symbols-outlined">remove</span>
</button>
<input className="bg-transparent border-none text-center w-full focus:ring-0 font-bold" type="number" value="12" />
<button className="w-10 h-10 flex items-center justify-center text-primary dark:text-blue-400 hover:bg-surface-container-highest dark:hover:bg-slate-700 rounded transition-colors">
<span className="material-symbols-outlined">add</span>
</button>
</div>
</div>
<div>
<label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400 mb-2 block">Site Category</label>
<select className="w-full bg-surface-container-low dark:bg-slate-800 border-none rounded-lg py-2.5 px-4 focus:ring-2 ring-primary/20 font-medium">
<option>Industrial Facility</option>
<option>Corporate Office</option>
<option>Public Infrastructure</option>
<option>Residential High-rise</option>
</select>
</div>
</div>
</div>
</section>
{/* Section: Advanced Requirements */}
<section className="p-8 bg-surface-container-low dark:bg-slate-900/50 rounded-xl border border-outline-variant/10">
<h2 className="text-xl font-bold mb-6 text-on-surface dark:text-slate-100 flex items-center gap-2">
<span className="material-symbols-outlined text-primary dark:text-blue-400">verified_user</span>
                        Technical Specifications
                    </h2>
<div className="space-y-4">
{/* Technical Switch 1 */}
<div className="flex items-center justify-between p-4 bg-surface-container-lowest dark:bg-slate-800 rounded-lg">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded bg-error-container/20 flex items-center justify-center text-error">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
</div>
<div>
<p className="font-bold text-on-surface dark:text-slate-100">Urgent Priority</p>
<p className="text-xs text-on-surface-variant dark:text-slate-400">Deployment required within 48 hours</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input className="sr-only peer" type="checkbox" value="" />
<div className="w-12 h-6 bg-surface-container-highest dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
{/* Technical Switch 2 */}
<div className="flex items-center justify-between p-4 bg-surface-container-lowest dark:bg-slate-800 rounded-lg">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded bg-primary-container/20 flex items-center justify-center text-primary dark:text-blue-400">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
</div>
<div>
<p className="font-bold text-on-surface dark:text-slate-100">Master Certification</p>
<p className="text-xs text-on-surface-variant dark:text-slate-400">Only L3 Senior Technicians can apply</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input checked="" className="sr-only peer" type="checkbox" value="" />
<div className="w-12 h-6 bg-surface-container-highest dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
</section>
</div>
{/* Right Column: Location & Preview */}
<div className="lg:col-span-5 space-y-6">
{/* Map Card */}
<div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(19,27,46,0.04)]">
<div className="p-6">
<h3 className="font-bold mb-1 text-on-surface dark:text-slate-100">Job Location</h3>
<p className="text-xs text-on-surface-variant dark:text-slate-400 mb-4">Coordinates: 40.7128° N, 74.0060° W</p>
<div className="relative h-64 w-full rounded-lg overflow-hidden bg-surface-container">
<Image className="w-full h-full object-cover grayscale opacity-80 dark:invert" alt="clean minimal vector map of downtown Manhattan with primary blue accent markers and soft grey roads" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOf_IpdYg2PkiYGaRSiDBzR-jxafSjmLA15-f2LV134-Rb98H0AUN1l1WJjl2oqvgDk06Wfn5zTcFvYZgYXUfzujO6EgS6rwvPfpR7Vfl9nqkhjnhgVx4Gd9VAMkLVW5KnZTa2MHOQh-On6YGh4iWjQtRFLjGkBZLTpZySSob_FUVxOyx9e_T4H76Pe-gpWczkwMWkMYFzQGJwf4xh-sMcauQMOUHhcffqcjbgTqhAI97kRe29n1prHZhOf1sgrmuWnmOUqdSNISfn" width={600} height={400} unoptimized />
<div className="absolute inset-0 flex items-center justify-center">
<div className="w-12 h-12 bg-primary/20 rounded-full animate-ping absolute"></div>
<span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
</div>
</div>
<div className="mt-4">
<input className="w-full bg-surface-container-low dark:bg-slate-800 border-none rounded-lg text-sm py-3 px-4 text-on-surface-variant dark:text-slate-300" readOnly="" type="text" value="750 7th Ave, New York, NY 10019" />
</div>
</div>
</div>
{/* Preview Insight */}
<div className="p-6 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl">
<div className="flex items-start gap-4">
<span className="material-symbols-outlined text-3xl">lightbulb</span>
<div>
<h4 className="font-bold text-lg mb-1">Smart Match Suggestion</h4>
<p className="text-sm opacity-90 leading-relaxed">Based on your technical requirements, we found 14 certified technicians in the New York area ready for immediate dispatch.</p>
</div>
</div>
</div>
{/* Footer Actions */}
<div className="flex items-center gap-4 pt-4">
<button className="flex-1 py-4 text-primary dark:text-blue-400 font-bold text-sm tracking-tight hover:bg-surface-container-high dark:hover:bg-slate-800 rounded-lg transition-all">
                        Save as Draft
                    </button>
<button className="flex-[2] py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg font-bold text-sm tracking-tight shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        Next: Technical Scope
                    </button>
</div>
</div>
</div>
</main>
{/* Footer */}
<footer className="w-full py-8 mt-auto bg-surface dark:bg-slate-950 border-t border-outline-variant/15 dark:border-slate-800">
<div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
<span className="text-xs Inter tracking-normal text-on-surface-variant dark:text-slate-500">© 2024 Team4Job Technical Systems</span>
<div className="flex gap-6">
<a className="text-xs Inter tracking-normal text-on-surface-variant dark:text-slate-500 hover:text-primary dark:hover:text-blue-300" href="#">Privacy Policy</a>
<a className="text-xs Inter tracking-normal text-on-surface-variant dark:text-slate-500 hover:text-primary dark:hover:text-blue-300" href="#">Technical Standards</a>
<a className="text-xs Inter tracking-normal text-on-surface-variant dark:text-slate-500 hover:text-primary dark:hover:text-blue-300" href="#">Support</a>
</div>
</div>
</footer>

    </div>
  );
}

export default StitchPostJobClient;
