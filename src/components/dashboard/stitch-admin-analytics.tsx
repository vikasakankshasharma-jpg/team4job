// @ts-nocheck
'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    LayoutDashboard, 
    Store, 
    CreditCard, 
    Settings, 
    Bell, 
    HelpCircle, 
    Search, 
    LogOut, 
    TrendingUp, 
    Wallet, 
    UserCheck, 
    Gavel, 
    ShieldAlert, 
    Map, 
    FileText, 
    MoreVertical,
    Activity,
    ChevronDown,
    Download,
    Layers,
    Wrench,
    Sparkles
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function StitchAdminAnalytics() {
  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-sans min-h-screen bg-slate-950 text-slate-100 selection:bg-primary selection:text-white"
    >
        {/* TopNavBar */}
        <header className="bg-slate-900/80 backdrop-blur-2xl flex justify-between items-center w-full px-8 py-3 h-16 border-b border-white/5 fixed top-0 z-50 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-10">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="p-3 rounded-[1rem] bg-primary/20 ring-2 ring-primary/20 group-hover:scale-110 transition-transform shadow-lg shadow-primary/10">
                        <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-2xl font-black italic tracking-tighter uppercase font-headline">Team4Job <span className="text-primary tracking-normal not-italic opacity-40">{"//"} ADMIN</span></span>
                </div>
                
                <div className="hidden md:flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4 group-hover:text-primary transition-colors" />
                        <input className="bg-slate-950/50 border border-white/5 text-xs py-2.5 pl-11 pr-6 w-80 rounded-[1.5rem] focus:ring-4 focus:ring-primary/10 focus:border-primary/40 text-slate-200 placeholder:text-slate-600 transition-all shadow-inner" placeholder="Execute system search..." type="text" />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <button className="text-slate-500 hover:text-primary hover:bg-primary/5 p-2 rounded-[1rem] transition-all relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    </button>
                    <button className="text-slate-500 hover:text-primary hover:bg-primary/5 p-2 rounded-[1rem] transition-all">
                        <Settings className="h-5 w-5" />
                    </button>
                    <button className="text-slate-500 hover:text-primary hover:bg-primary/5 p-2 rounded-[1rem] transition-all">
                        <HelpCircle className="h-5 w-5" />
                    </button>
                </div>
                <div className="h-10 w-[1px] bg-white/5 mx-2" />
                <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-200 leading-none">A. ARCHITECT</p>
                        <p className="text-[9px] font-black text-primary uppercase mt-1 opacity-60">Super Admin</p>
                    </div>
                    <div className="h-10 w-10 rounded-[1.25rem] overflow-hidden bg-slate-800 border-2 border-primary/20 shadow-lg shadow-primary/5 group-hover:scale-105 transition-transform">
                        <Image alt="Admin Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAo0ZXVjK4jS3frKv2jlLWs4Uuc546rwgUaKWlQJhC6QcYEEWJpkUMLInvMnmaZwmP88SPtT3fNCRCObhdu7R65Lep0PHWguYLVQNuflmyQXB2wGWDdTNLj5ezdIyd2KaChE6SIeV1FDmKyGlhDGZXlElO-R3QCMdeDM_kGmRgoqDF_kQD7G-fsZ1XBWbo9HpviSACZQBjNh8Qfd1wvhPtuBNlqnMTE7vie0d1oIlzr0FP7tTiRQp_SLObON0Km1YYXEUsp9WxZr5ok" width={40} height={40} unoptimized />
                    </div>
                </div>
            </div>
        </header>

        {/* SideNavBar */}
        <aside className="bg-slate-900/40 backdrop-blur-2xl flex flex-col h-screen fixed left-0 top-0 pt-20 pb-6 px-4 w-72 border-r border-white/5 z-40 transition-all">
            <div className="mb-10 px-4 py-6 rounded-[2rem] bg-slate-950/40 border border-white/5 shadow-inner">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 flex items-center justify-center rounded-[1.25rem] shadow-xl shadow-primary/10 ring-1 ring-primary/20 border border-white/5">
                        <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-slate-100 font-black italic tracking-tighter uppercase text-sm">ARCHITECT CORE</h3>
                        <p className="text-[10px] text-primary font-black tracking-widest uppercase opacity-60 mt-0.5">V2.4.0 // STABLE</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {[
                    { icon: LayoutDashboard, label: 'Overview', active: true, color: 'text-primary' },
                    { icon: Store, label: 'Marketplace', active: false, color: 'text-slate-500' },
                    { icon: CreditCard, label: 'Financials', active: false, color: 'text-slate-500' },
                    { icon: Wrench, label: 'Admin Tools', active: false, color: 'text-slate-500' },
                    { icon: UserCheck, label: 'Compliance', active: false, color: 'text-slate-500' },
                ].map((item, idx) => (
                    <Link 
                        key={idx} 
                        href="#" 
                        className={`flex items-center gap-4 px-6 py-3.5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all group ${item.active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 italic' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}`}
                    >
                        <item.icon className={`h-5 w-5 ${item.active ? 'text-primary-foreground' : 'group-hover:text-primary transition-colors'}`} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
                <button className="w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center gap-4 px-6 py-3.5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all group">
                    <LogOut className="h-5 w-5 group-hover:translate-x-1 duration-200" />
                    <span>Terminate Session</span>
                </button>
            </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="ml-72 pt-16 min-h-screen p-10 space-y-12">
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
                <div className="space-y-2">
                    <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.5em] bg-primary/10 backdrop-blur-3xl italic">
                        COMMAND TERMINAL // AD-CLEARANCE ALPHA
                    </Badge>
                    <h1 className="text-6xl sm:text-7xl md:text-8xl font-black italic tracking-tighter uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-[0.85] mb-4">
                        Analytics Hub
                    </h1>
                </div>
                <div className="flex items-center bg-slate-900/50 p-1.5 rounded-[1.5rem] ring-1 ring-white/5 shadow-2xl">
                    {['24H', '7D', '30D', '1Y'].map((range, i) => (
                        <button 
                            key={i} 
                            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-[1.25rem] transition-all ${range === '7D' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Growth Rate', value: '+12.4%', sub: 'vs last week', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/20', progress: 70 },
                    { label: 'Escrow Volume', value: '₹2.4M', sub: 'Total locked', icon: Wallet, color: 'text-success', bg: 'bg-success/20', progress: 45 },
                    { label: 'Pending KYC', value: '148', sub: 'Action required', icon: ShieldAlert, color: 'text-blue-500', bg: 'bg-blue-500/20', progress: 85 },
                    { label: 'Open Disputes', value: '24', sub: 'High urgency', icon: Gavel, color: 'text-warning', bg: 'bg-warning/20', progress: 30 },
                ].map((kpi, idx) => (
                    <motion.div 
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden group ring-1 ring-white/5"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-500 italic opacity-60">{kpi.label}</span>
                            <kpi.icon className={`h-6 w-6 ${kpi.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                        </div>
                        <div className="flex items-baseline gap-3">
                            <h2 className={`text-4xl font-black italic tracking-tighter ${kpi.color}`}>{kpi.value}</h2>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 opacity-40">{kpi.sub}</p>
                        <div className="mt-8 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${kpi.progress}%` }}
                                transition={{ delay: idx * 0.1, duration: 1 }}
                                className={`h-full ${kpi.color.replace('text-', 'bg-')} opacity-80 shadow-[0_0_12px_rgba(var(--primary),0.5)]`} 
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Chart & Recent Disputes Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Large Chart Section */}
                <Card className="lg:col-span-8 border-none bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] relative ring-1 ring-white/5 group">
                    <CardHeader className="p-10 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-4">
                            <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
                            <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Platform Revenue & Volume</CardTitle>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">REVENUE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">VOLUME</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12">
                        <div className="aspect-[16/7] w-full relative group/chart">
                            <div className="absolute inset-0 flex items-end justify-between gap-3">
                                {[40, 65, 55, 80, 70, 95, 85].map((h, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: i * 0.1, duration: 1 }}
                                        className="bg-primary/20 hover:bg-primary/40 rounded-[0.5rem] w-full relative transition-all group/bar"
                                    >
                                        <div className="absolute inset-0 bg-primary opacity-0 group-hover/bar:opacity-100 blur-lg transition-opacity" />
                                    </motion.div>
                                ))}
                            </div>
                            <div className="absolute inset-0 flex items-end justify-between gap-3 pointer-events-none">
                                {[20, 35, 30, 50, 40, 65, 60].map((h, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                                        className="bg-blue-500/40 w-full rounded-[0.5rem]" 
                                    />
                                ))}
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/10" />
                            <div className="absolute bottom-0 left-0 h-full w-[1px] bg-white/10" />
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-slate-500 mt-8 px-4 uppercase tracking-[0.2em] italic opacity-40">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Disputes Feed */}
                <div className="lg:col-span-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-3xl rounded-[3rem] flex flex-col border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)] relative overflow-hidden group ring-1 ring-white/5">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h3 className="text-xl font-black italic tracking-tighter uppercase text-warning">Incident Feed</h3>
                        <Badge variant="warning" className="px-3 py-1 font-black text-[9px] uppercase tracking-widest bg-warning/20 border-warning/20">LIVE</Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {[
                            { id: '#DS-8902', time: '2m ago', icon: ShieldAlert, color: 'text-warning', title: 'Escrow release blocked', user: 'AlphaLabs' },
                            { id: '#DS-8891', time: '14m ago', icon: Gavel, color: 'text-primary', title: 'Milestone 4 mismatch', user: 'QuantumDev' },
                            { id: '#DS-8874', time: '1h ago', icon: ShieldAlert, color: 'text-warning', title: 'Verification rejected', user: 'User_4091' },
                        ].map((dispute, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ scale: 1.02, x: 5 }}
                                className="bg-white/5 p-6 rounded-[2rem] border-l-4 border-warning shadow-xl hover:bg-white/10 transition-all cursor-pointer relative group/item"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-slate-100 italic">{dispute.id}</span>
                                    <span className="text-[9px] font-black uppercase text-slate-500 italic">{dispute.time}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-300 leading-relaxed mb-4">{dispute.title}</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                                        <Sparkles className="h-3 w-3 text-warning opacity-40" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic opacity-60">ADMIN: {dispute.user}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <button className="w-full py-8 text-[10px] font-black text-primary uppercase tracking-[0.5em] border-t border-white/5 hover:bg-primary/10 transition-all font-headline italic">
                        Access Full Registry
                    </button>
                </div>
            </div>

            {/* Heatmap & Nodes */}
            <Card className="border-none bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-3xl rounded-[3rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12">
                    <Map className="h-32 w-32 text-primary" />
                </div>
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <Activity className="h-6 w-6 text-primary animate-pulse" />
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase">Production Heartbeat</h3>
                    </div>
                    <div className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full border border-primary/20">LIVE // GLOBAL_NODE_SYNC</div>
                </div>
                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-8 bg-black/40 h-80 rounded-[2.5rem] relative overflow-hidden border border-white/5 shadow-inner">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://placeholder.pics/svg/800')] bg-cover grayscale" />
                        <div className="absolute top-[30%] left-[20%] w-4 h-4 bg-primary rounded-full animate-ping opacity-50" />
                        <div className="absolute top-[30%] left-[20%] w-2 h-2 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),0.8)]" />
                        <div className="absolute top-[45%] left-[45%] w-2 h-2 bg-success rounded-full" />
                        <div className="absolute top-[60%] left-[70%] w-6 h-6 bg-primary rounded-full animate-pulse opacity-20" />
                        <div className="absolute top-[25%] left-[85%] w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
                        {[
                            { label: 'NORTH AMERICA', val: '4,209', active: false },
                            { label: 'EUROPE (DACH)', val: '8,112', active: true },
                            { label: 'ASIA PACIFIC', val: '2,554', active: false },
                            { label: 'LATAM', val: '1,098', active: false },
                        ].map((region, i) => (
                            <div key={i} className={`bg-white/5 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center border ${region.active ? 'border-primary/20 bg-primary/5' : 'border-white/5'} transition-all hover:scale-105`}>
                                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 italic ${region.active ? 'text-primary' : 'text-slate-500'}`}>{region.label}</span>
                                <span className="text-3xl font-black italic tracking-tighter text-slate-100">{region.val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Data Table Section */}
            <Card className="border-none bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5">
                <div className="p-8 bg-white/5 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase">KYC Verification Queue</h3>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" className="px-6 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/5">
                            <Download className="mr-2 h-4 w-4" /> CSV Registry
                        </Button>
                        <Button className="px-6 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">
                            Bulk Execute
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/20">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Professional Node</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Production Tier</th>
                                <th className="px-10 py-6 text-[10px) font-black text-slate-500 uppercase tracking-widest italic">Node Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Timestamp</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">System Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {[
                                { name: 'Elias Kaelin', role: 'Security Node', tier: 'L3 SENIOR', status: 'Background Sync', time: '2024.05.12' },
                                { name: 'Amara Miller', role: 'Fullstack Node', tier: 'L1 ASSOCIATE', status: 'Identity Confirmed', time: '2024.05.12' },
                                { name: 'Jaxon Drake', role: 'Data Architect', tier: 'L3 SENIOR', status: 'Missing Docs', time: '2024.05.11', err: true },
                            ].map((user, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-all border-b border-white/5 group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-[1rem] bg-slate-800 flex items-center justify-center font-black italic text-primary border border-primary/20 group-hover:scale-110 transition-transform shadow-lg shadow-primary/10">
                                                {user.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black italic tracking-tighter text-slate-200 uppercase">{user.name}</p>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic opacity-60">{user.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <Badge variant="outline" className="px-3 py-1 font-black text-[9px] uppercase tracking-widest border-primary/20 bg-primary/5 text-primary italic">{user.tier}</Badge>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${user.err ? 'bg-warning' : 'bg-primary'} animate-pulse`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest italic ${user.err ? 'text-warning' : 'text-slate-300'}`}>{user.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 font-mono text-[10px] text-slate-500 italic uppercase">{user.time}</td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" className="h-9 px-4 rounded-[1rem] font-black text-[9px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all underline underline-offset-4 decoration-primary/20">Audit</Button>
                                            <Button variant="ghost" className="h-9 px-4 rounded-[1rem] font-black text-[9px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all">Authorize</Button>
                                            <Button variant="ghost" className="h-9 w-9 p-0 rounded-[1rem] hover:bg-white/10">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>

        {/* Footer */}
        <footer className="bg-slate-900/40 backdrop-blur-2xl flex justify-between items-center px-12 py-4 w-full ml-72 border-t border-white/5 fixed bottom-0 z-40">
            <div className="flex gap-10 items-center">
                <span className="text-slate-600 font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-3">
                    <Activity className="h-3 w-3 text-primary opacity-60" />
                    SYSTEM STATUS: <span className="text-primary italic">OPERATIONAL // NODE_01</span>
                </span>
            </div>
            <div className="flex gap-10 items-center">
                {['Technical Standards', 'API Terminal', 'Data Protection'].map((link, i) => (
                    <a key={i} className="text-slate-600 hover:text-primary underline underline-offset-8 decoration-primary/20 font-black text-[9px] uppercase tracking-widest transition-all opacity-60 hover:opacity-100 italic" href="#">{link}</a>
                ))}
            </div>
        </footer>
    </motion.div>
  );
}

export default StitchAdminAnalytics;
