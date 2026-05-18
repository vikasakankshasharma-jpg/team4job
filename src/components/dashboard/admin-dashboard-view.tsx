"use client";

import React from "react";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useTranslations } from 'next-intl';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Users,
    Briefcase,
    AlertOctagon,
    IndianRupee,
    Shield,
    FileText,
    TrendingUp,
    CheckCircle,
    XCircle,
    UserCheck,
    Search,
    ShieldCheck,
    Layers,
    ListFilter,
    Clock,
    UserPlus,
    Lock,
    HelpCircle
} from "lucide-react";
import { useHelp } from "@/hooks/use-help";
import { Transaction, User, Job } from "@/lib/types";
import { collection, query, limit, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { toDate } from "@/lib/utils";
import { format, subMonths, startOfMonth } from "date-fns";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/dashboard/cards/stat-card";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { FinancialSummaryCard } from "@/components/dashboard/cards/financial-summary-card";
import { TopPerformersCard } from "@/components/dashboard/cards/top-performers-card";
import { JOB_STATUS, TRANSACTION_STATUS, DISPUTE_STATUS, USER_ROLES } from "@/lib/constants/statuses";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlag } from "@/lib/feature-flags-client";

const AdminRevenueChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminRevenueChart), { ssr: false });
const AdminSystemHealthChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminSystemHealthChart), { ssr: false });
const AdminUserGrowthChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminUserGrowthChart), { ssr: false });

type ActiveTab = 'dashboard' | 'cases' | 'queue' | 'finops' | 'audit';

export function AdminDashboardView() {
    const { db, auth } = useFirebase();
    const { setHelp } = useHelp();
    const t = useTranslations('admin.dashboard');
    const [activeTab, setActiveTab] = React.useState<ActiveTab>('dashboard');
    
    // Feature flags
    const isCaseMgmtEnabled = useFeatureFlag('case_mgmt_v1');
    const isTriageEnabled = useFeatureFlag('triage_v1');
    const isFinOpsEnabled = useFeatureFlag('finops_v1');

    // Data states
    const [stats, setStats] = React.useState({ totalUsers: 0, totalJobs: 0, openDisputes: 0, totalValueReleased: 0 });
    const [loading, setLoading] = React.useState(true);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [allUsers, setAllUsers] = React.useState<User[]>([]);
    const [allJobs, setAllJobs] = React.useState<Job[]>([]);
    const [cases, setCases] = React.useState<any[]>([]);
    const [queueItems, setQueueItems] = React.useState<any[]>([]);
    const [exceptions, setExceptions] = React.useState<any[]>([]);
    const [approvalRequests, setApprovalRequests] = React.useState<any[]>([]);
    const [auditStatus, setAuditStatus] = React.useState<any>(null);
    const [verifyingAudit, setVerifyingAudit] = React.useState(false);
    
    // Modal states
    const [selectedCase, setSelectedCase] = React.useState<any | null>(null);
    const [newCaseForm, setNewCaseForm] = React.useState({
        title: '',
        description: '',
        type: 'dispute',
        priority: 'medium',
        severity: 'medium',
        slaHours: 48,
    });
    const [isCreatingCase, setIsCreatingCase] = React.useState(false);

    const currentUser = useUser();
    const isAdmin = currentUser.isAdmin;

    const fetchAllData = async () => {
        if (!db) return;
        setLoading(true);
        try {
            const usersRef = collection(db, "users");
            const jobsRef = collection(db, "jobs");
            const disputesRef = collection(db, "disputes");
            const transactionsRef = collection(db, "transactions");
            const casesRef = collection(db, "cases");
            const queueRef = collection(db, "case_queue");
            const exceptionsRef = collection(db, "financial_exceptions");
            const approvalsRef = collection(db, "approval_requests");

            const [
                usersSnap, 
                jobsSnap, 
                disputesSnap, 
                transactionsSnap,
                casesSnap,
                queueSnap,
                exceptionsSnap,
                approvalsSnap
            ] = await Promise.all([
                getDocs(query(usersRef, limit(100))),
                getDocs(query(jobsRef, limit(100))),
                getDocs(disputesRef),
                getDocs(query(transactionsRef, limit(100))),
                getDocs(casesRef),
                getDocs(queueRef),
                getDocs(exceptionsRef),
                getDocs(approvalsRef)
            ]);

            const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
            setAllUsers(users);
            
            const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
            setAllJobs(jobs);

            const txs = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
            setTransactions(txs);

            const openDisputesCount = disputesSnap.docs.filter(d => d.data().status === DISPUTE_STATUS.OPEN).length;
            const releasedValue = txs.filter(t => t.status === TRANSACTION_STATUS.RELEASED).reduce((acc, t) => acc + (t.payoutToProfessional || 0), 0);

            setStats({
                totalUsers: usersSnap.size,
                totalJobs: jobsSnap.size,
                openDisputes: openDisputesCount,
                totalValueReleased: releasedValue
            });

            // Domain data
            setCases(casesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setQueueItems(queueSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setExceptions(exceptionsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setApprovalRequests(approvalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (e) {
            console.error("Audit Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (!db || !isAdmin) return;
        fetchAllData();
    }, [db, isAdmin]);

    React.useEffect(() => {
        setHelp({
            title: t('guide.title') || "Admin Operating Command",
            content: (
                <div className="space-y-4 text-sm text-foreground/80">
                    <p>{t('guide.welcome') || "Unified system management portal for cases, triage queues, audit integrity and dual-control overrides."}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">Case Management:</span> Tracks user disputes and system events with immutable timelines.</li>
                        <li><span className="font-semibold">Triage Queue:</span> Automatically scores and claims cases based on urgency.</li>
                        <li><span className="font-semibold">Financial Ops:</span> Logs anomalous transactions and requests secondary approvals.</li>
                        <li><span className="font-semibold">Audit Health:</span> Validates rolling SHA-256 integrity chains of admin actions.</li>
                    </ul>
                </div>
            )
        });
    }, [setHelp, t]);

    const userGrowthData = React.useMemo(() => {
        const now = new Date();
        const data = Array.from({ length: 6 }).map((_, i) => {
            const monthDate = subMonths(startOfMonth(now), i);
            const monthName = format(monthDate, 'MMM');
            return { name: monthName, professionals: 0, clients: 0 };
        }).reverse();

        (allUsers || []).forEach(user => {
            if (!user.memberSince) return;

            const joinDate = toDate(user.memberSince);
            if (joinDate > subMonths(now, 6)) {
                const monthName = format(joinDate, 'MMM');
                const monthData = data.find(m => m.name === monthName);
                if (monthData) {
                    if (user.roles?.includes(USER_ROLES.professional)) monthData.professionals++;
                    if (user.roles?.includes(USER_ROLES.client)) monthData.clients++;
                }
            }
        });
        return data;
    }, [allUsers]);

    const { revenueData, jobHealthData } = React.useMemo(() => {
        const months = Array.from({ length: 6 }).map((_, i) => {
            const d = subMonths(new Date(), i);
            return {
                name: format(d, 'MMM'),
                fullName: format(d, 'MMM yyyy'),
                revenue: 0
            };
        }).reverse();

        transactions.forEach(t => {
            if (t.status === TRANSACTION_STATUS.RELEASED && t.releasedAt) {
                const date = toDate(t.releasedAt);
                const month = format(date, 'MMM');
                const monthStr = format(date, 'MMM yyyy');
                const monthData = months.find(m => m.fullName === monthStr);
                if (monthData) {
                    const commission = t.commission || 0;
                    const fee = t.clientFee || 0;
                    monthData.revenue += (commission + fee);
                }
            }
        });

        const jobCounts = (allJobs || []).reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const jobHealthData = Object.entries(jobCounts).map(([status, count]) => ({
            name: status,
            value: count,
            color: status === JOB_STATUS.COMPLETED ? '#00C49F' : status === JOB_STATUS.IN_PROGRESS ? '#0088FE' : status === JOB_STATUS.OPEN_FOR_BIDDING ? '#FFBB28' : '#FF8042'
        }));

        return { revenueData: months, jobHealthData };
    }, [allJobs, transactions]);

    const totalRevenue = revenueData.reduce((acc, m) => acc + m.revenue, 0);

    const handleVerifyAudit = async () => {
        setVerifyingAudit(true);
        try {
            // Trigger check via verify-integrity route
            const token = await auth?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/action-log/verify-integrity', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setAuditStatus(data);
        } catch (e) {
            console.error(e);
        } finally {
            setVerifyingAudit(false);
        }
    };

    const handleCreateCase = async () => {
        if (!newCaseForm.title || !newCaseForm.description) return;
        setIsCreatingCase(true);
        try {
            const token = await auth?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/cases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newCaseForm)
            });
            
            if (res.ok) {
                setNewCaseForm({
                    title: '',
                    description: '',
                    type: 'dispute',
                    priority: 'medium',
                    severity: 'medium',
                    slaHours: 48,
                });
                fetchAllData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreatingCase(false);
        }
    };

    const handleClaimCase = async () => {
        try {
            const token = await auth?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/cases/queue', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                fetchAllData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleApprovalDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
        try {
            const token = await auth?.currentUser?.getIdToken();
            
            // Look up request
            const req = approvalRequests.find(r => r.id === requestId);
            if (!req) return;

            // Find corresponding case
            const linkedCase = cases.find(c => c.linkedEntities?.some((ent: any) => ent.id === req.id));

            if (linkedCase) {
                const res = await fetch(`/api/admin/cases/${linkedCase.id}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        approvalId: req.id,
                        decision
                    })
                });

                if (res.ok) {
                    fetchAllData();
                } else {
                    const errData = await res.json();
                    alert(errData.error || 'Failed to submit decision');
                }
            } else {
                alert('No corresponding case found for approval routing');
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="space-y-12 lg:space-y-16 w-full pb-16">
            <header className="space-y-4">
                <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.5em] bg-primary/10 backdrop-blur-3xl italic">
                    PLATFORM COMMAND CENTER {"//"} SYSTEM OS
                </Badge>
                <h1 className="text-6xl sm:text-7xl md:text-8xl font-black font-headline tracking-tighter text-on-surface leading-[0.85] italic uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                    Command Command
                </h1>
                
                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-2 pt-6">
                    <button 
                        onClick={() => setActiveTab('dashboard')} 
                        className={`px-8 py-3 rounded-full text-xs font-black italic tracking-widest uppercase transition-all ring-1 ${activeTab === 'dashboard' ? 'bg-primary text-primary-foreground ring-primary shadow-2xl' : 'bg-surface-container-low/40 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 text-foreground ring-white/5'}`}
                    >
                        Dashboard
                    </button>
                    {isCaseMgmtEnabled && (
                        <button 
                            onClick={() => setActiveTab('cases')} 
                            className={`px-8 py-3 rounded-full text-xs font-black italic tracking-widest uppercase transition-all ring-1 ${activeTab === 'cases' ? 'bg-primary text-primary-foreground ring-primary shadow-2xl' : 'bg-surface-container-low/40 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 text-foreground ring-white/5'}`}
                        >
                            Case Mgmt ({cases.length})
                        </button>
                    )}
                    {isTriageEnabled && (
                        <button 
                            onClick={() => setActiveTab('queue')} 
                            className={`px-8 py-3 rounded-full text-xs font-black italic tracking-widest uppercase transition-all ring-1 ${activeTab === 'queue' ? 'bg-primary text-primary-foreground ring-primary shadow-2xl' : 'bg-surface-container-low/40 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 text-foreground ring-white/5'}`}
                        >
                            Triage Queue ({queueItems.length})
                        </button>
                    )}
                    {isFinOpsEnabled && (
                        <button 
                            onClick={() => setActiveTab('finops')} 
                            className={`px-8 py-3 rounded-full text-xs font-black italic tracking-widest uppercase transition-all ring-1 ${activeTab === 'finops' ? 'bg-primary text-primary-foreground ring-primary shadow-2xl' : 'bg-surface-container-low/40 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 text-foreground ring-white/5'}`}
                        >
                            Financial Exception ({exceptions.length})
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('audit')} 
                        className={`px-8 py-3 rounded-full text-xs font-black italic tracking-widest uppercase transition-all ring-1 ${activeTab === 'audit' ? 'bg-primary text-primary-foreground ring-primary shadow-2xl' : 'bg-surface-container-low/40 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 text-foreground ring-white/5'}`}
                    >
                        Audit Health
                    </button>
                </div>
            </header>

            {/* TAB CONTENT: DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <FinancialSummaryCard transactions={transactions} />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard title={t('totalUsers') || "Total Users"} value={stats.totalUsers} icon={Users} href="/dashboard/users" iconBgColor="bg-blue-500" iconColor="text-white" />
                        <StatCard title={t('totalJobs') || "Total Jobs"} value={stats.totalJobs} icon={Briefcase} href="/dashboard/all-jobs" iconBgColor="bg-purple-500" iconColor="text-white" />
                        <StatCard title={t('activeDisputes') || "Disputes"} value={stats.openDisputes} icon={AlertOctagon} href="/dashboard/disputes" iconBgColor="bg-red-500" iconColor="text-white" />
                        <StatCard title={t('valueReleased') || "Released"} value={`₹${stats.totalValueReleased.toLocaleString()}`} icon={IndianRupee} href="/dashboard/transactions" iconBgColor="bg-green-500" iconColor="text-white" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <AdminRevenueChart data={revenueData} totalRevenue={totalRevenue} />
                        <AdminSystemHealthChart data={jobHealthData} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="col-span-1">
                            <Card className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5 group">
                                <CardHeader className="p-10 pb-6 border-b border-white/5 bg-white/5">
                                    <CardTitle className="text-sm font-black italic tracking-[0.3em] uppercase text-primary flex items-center gap-3">
                                        <Users className="h-5 w-5" /> {t('recentSignups') || "Recent Signups"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-10">
                                    <div className="space-y-4">
                                        {[...allUsers].sort((a, b) => toDate(b.memberSince).getTime() - toDate(a.memberSince).getTime()).slice(0, 5).filter(u => u.id).map((u, index) => (
                                            <div key={u.id || `user-${index}`} className="flex items-center gap-5 p-4 rounded-[2rem] bg-background/20 backdrop-blur-md border border-white/5 hover:bg-background/40 transition-all hover:translate-x-2 shadow-inner group/user ring-1 ring-white/5">
                                                <Avatar className="h-12 w-12 border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                                    <AnimatedAvatar svg={u.avatarUrl} />
                                                    <AvatarFallback className="font-black italic text-xs">{u.name?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-base font-black italic tracking-tighter uppercase truncate leading-none mb-1">{u.name || t('unknownUser') || "Unknown"}</p>
                                                    <p className="text-[9px] font-black tracking-[0.3em] text-muted-foreground/40 uppercase italic">{u.roles?.join(' // ') || 'Standard Unit'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <TopPerformersCard Professionals={(allUsers || []).filter(u => Array.isArray(u.roles) && u.roles.includes(USER_ROLES.professional))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <AdminUserGrowthChart data={userGrowthData} />
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CASE MANAGEMENT */}
            {activeTab === 'cases' && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="p-8 rounded-[2rem] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 ring-1 ring-white/5">
                            <p className="text-xs font-black italic tracking-widest text-primary uppercase">Open Cases</p>
                            <p className="text-5xl font-black italic tracking-tighter mt-2">{cases.filter(c => c.status !== 'closed').length}</p>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 ring-1 ring-white/5">
                            <p className="text-xs font-black italic tracking-widest text-red-400 uppercase">High Priority</p>
                            <p className="text-5xl font-black italic tracking-tighter mt-2 text-red-400">{cases.filter(c => c.priority === 'high' && c.status !== 'closed').length}</p>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 ring-1 ring-white/5">
                            <p className="text-xs font-black italic tracking-widest text-green-400 uppercase">Resolved (All time)</p>
                            <p className="text-5xl font-black italic tracking-tighter mt-2 text-green-400">{cases.filter(c => c.status === 'closed').length}</p>
                        </div>
                    </div>

                    {/* New Case Creator */}
                    <Card className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden ring-1 ring-white/5">
                        <CardHeader className="p-10">
                            <CardTitle className="text-xl font-black italic tracking-widest uppercase text-primary">Open Manual System Case</CardTitle>
                            <CardDescription className="text-foreground/60">Generate a custom administrative investigation and resolution pipeline.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-0 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-primary/80">Case Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Disputed platform service invoice"
                                        value={newCaseForm.title}
                                        onChange={e => setNewCaseForm({...newCaseForm, title: e.target.value})}
                                        className="w-full px-5 py-3 rounded-2xl bg-background/50 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-primary/80">Case Category</label>
                                    <select 
                                        value={newCaseForm.type}
                                        onChange={e => setNewCaseForm({...newCaseForm, type: e.target.value})}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-950 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="dispute">Dispute</option>
                                        <option value="refund">Refund Exception</option>
                                        <option value="payout_mismatch">Payout Exception</option>
                                        <option value="compliance_breach">Compliance Breach</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest uppercase text-primary/80">Detailed Investigation Objective</label>
                                <textarea 
                                    rows={3}
                                    placeholder="Enter descriptive evidence, trigger triggers, and target criteria..."
                                    value={newCaseForm.description}
                                    onChange={e => setNewCaseForm({...newCaseForm, description: e.target.value})}
                                    className="w-full px-5 py-3 rounded-2xl bg-background/50 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-primary/80">Triage Priority</label>
                                    <select 
                                        value={newCaseForm.priority}
                                        onChange={e => setNewCaseForm({...newCaseForm, priority: e.target.value})}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-950 border border-white/10 text-foreground text-sm"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-primary/80">Severity</label>
                                    <select 
                                        value={newCaseForm.severity}
                                        onChange={e => setNewCaseForm({...newCaseForm, severity: e.target.value})}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-950 border border-white/10 text-foreground text-sm"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest uppercase text-primary/80">SLA Breach Window (Hours)</label>
                                    <input 
                                        type="number"
                                        value={newCaseForm.slaHours}
                                        onChange={e => setNewCaseForm({...newCaseForm, slaHours: parseInt(e.target.value, 10)})}
                                        className="w-full px-5 py-3 rounded-2xl bg-background/50 border border-white/10 text-foreground text-sm"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button 
                                    onClick={handleCreateCase}
                                    disabled={isCreatingCase}
                                    className="px-10 py-3 rounded-full bg-primary text-primary-foreground font-black italic tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    {isCreatingCase ? 'Creating...' : 'Initialize Investigation'}
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Cases List */}
                    <Card className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden ring-1 ring-white/5">
                        <CardHeader className="p-10">
                            <CardTitle className="text-sm font-black italic tracking-[0.3em] uppercase text-primary flex items-center gap-3">
                                <Briefcase className="h-5 w-5" /> Case Investigations Portfolio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                            <div className="space-y-4">
                                {cases.length === 0 ? (
                                    <p className="text-foreground/50 text-sm italic py-4">No cases registered on this node.</p>
                                ) : (
                                    cases.map((c, index) => (
                                        <div 
                                            key={c.id || index}
                                            onClick={() => setSelectedCase(c)}
                                            className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-[2rem] bg-background/25 hover:bg-background/45 border border-white/5 transition-all cursor-pointer shadow-inner"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <p className="text-base font-black italic uppercase text-foreground leading-none tracking-tight">{c.title}</p>
                                                    <Badge className={`${c.status === 'closed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} font-black uppercase text-[8px] tracking-widest px-2 py-0.5 rounded-full`}>
                                                        {c.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-foreground/60 line-clamp-1">{c.description}</p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">Priority</p>
                                                    <p className={`text-xs font-black uppercase ${c.priority === 'high' ? 'text-red-400' : 'text-foreground'}`}>{c.priority}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">SLA Breach</p>
                                                    <p className="text-xs font-mono">{c.slaDueAt ? format(toDate(c.slaDueAt), 'yyyy-MM-dd HH:mm') : 'None'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Case Detail Modal */}
                    {selectedCase && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-20 duration-300">
                            <Card className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                                <CardHeader className="p-10 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                        <Badge className="bg-primary/20 text-primary px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase">
                                            Case {selectedCase.id.substring(0, 8)}
                                        </Badge>
                                        <button 
                                            onClick={() => setSelectedCase(null)} 
                                            className="text-foreground/50 hover:text-foreground text-xs uppercase font-black tracking-widest"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-white mt-4">{selectedCase.title}</CardTitle>
                                    <CardDescription className="text-foreground/60 mt-2">{selectedCase.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 max-h-[60vh] overflow-y-auto space-y-6">
                                    {/* Timeline entries */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-primary">Immutable Case Timeline</h3>
                                        {selectedCase.timeline?.length === 0 || !selectedCase.timeline ? (
                                            <p className="text-sm italic text-foreground/50">No operations executed yet.</p>
                                        ) : (
                                            selectedCase.timeline.map((entry: any, index: number) => (
                                                <div key={index} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black uppercase tracking-wider text-white">
                                                            {entry.action.toUpperCase()} {"//"} {entry.actorName} ({entry.actorRole})
                                                        </p>
                                                        <p className="text-xs text-foreground/70">{entry.note}</p>
                                                        <p className="text-[10px] font-mono text-foreground/40">{entry.timestamp ? format(toDate(entry.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: TRIAGE QUEUE */}
            {activeTab === 'queue' && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <Card className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden ring-1 ring-white/5">
                        <CardHeader className="p-10 flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <CardTitle className="text-xl font-black italic tracking-widest uppercase text-primary">Prioritized Triage Queue</CardTitle>
                                <CardDescription className="text-foreground/60">Dynamic rank computation based on values-at-risk, SLA proximity, fraud metrics, and completeness penalties.</CardDescription>
                            </div>
                            <button 
                                onClick={handleClaimCase}
                                className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-black italic tracking-widest text-xs uppercase hover:scale-105 transition-all shadow-lg"
                            >
                                Claim Highest Urgent Case
                            </button>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                            <div className="space-y-4">
                                {queueItems.length === 0 ? (
                                    <p className="text-foreground/50 text-sm italic py-4">Triage queue empty. Run recompute cron to materialize.</p>
                                ) : (
                                    [...queueItems].sort((a,b) => b.score - a.score).map((item, index) => (
                                        <div 
                                            key={item.id || index}
                                            className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-[2rem] bg-background/25 border border-white/5 hover:bg-background/35 transition-all shadow-inner"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs font-black uppercase tracking-widest text-primary">Rank #{index + 1}</p>
                                                    <p className="text-base font-black italic uppercase text-foreground leading-none tracking-tight">{item.title}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-xs text-foreground/60 pt-1">
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> SLA Due: {item.slaDueAt ? format(toDate(item.slaDueAt), 'yyyy-MM-dd HH:mm') : 'N/A'}</span>
                                                    <span>•</span>
                                                    <span>Owner: {item.ownerAdminId || 'Unowned'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">Risk Weight</p>
                                                    <p className="text-sm font-black text-red-400 font-mono">{item.score} pts</p>
                                                </div>
                                                {/* Breakdown panel triggers */}
                                                <div className="text-right border-l border-white/10 pl-6 space-y-1">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-foreground/50">SLA score: {Math.round(item.breakdown?.slaProximityScore || 0)}</p>
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-foreground/50">Risk score: {Math.round(item.breakdown?.fraudLikelihoodScore || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: FINANCIAL OVERRIDES & EXCEPTIONS */}
            {activeTab === 'finops' && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="p-8 rounded-[2rem] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 ring-1 ring-white/5">
                            <p className="text-xs font-black italic tracking-widest text-primary uppercase">Financial Anomaly Exceptions</p>
                            <p className="text-5xl font-black italic tracking-tighter mt-2">{exceptions.length}</p>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 ring-1 ring-white/5">
                            <p className="text-xs font-black italic tracking-widest text-yellow-400 uppercase">Pending Dual-Control Approvals</p>
                            <p className="text-5xl font-black italic tracking-tighter mt-2 text-yellow-400">{approvalRequests.filter(r => r.status === 'pending').length}</p>
                        </div>
                    </div>

                    {/* Pending Dual-Control Approvals */}
                    <Card className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden ring-1 ring-white/5">
                        <CardHeader className="p-10">
                            <CardTitle className="text-xl font-black italic tracking-widest uppercase text-yellow-400 flex items-center gap-3">
                                <Lock className="h-5 w-5 text-yellow-400" /> Pending Dual-Control Requests
                            </CardTitle>
                            <CardDescription className="text-foreground/60">Crucial bypass approvals requiring separation-of-duties secondary signoff.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                            <div className="space-y-4">
                                {approvalRequests.filter(r => r.status === 'pending').length === 0 ? (
                                    <p className="text-foreground/50 text-sm italic py-4">No pending dual-control overrides.</p>
                                ) : (
                                    approvalRequests.filter(r => r.status === 'pending').map((req, index) => (
                                        <div 
                                            key={req.id || index}
                                            className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-[2rem] bg-background/25 border border-white/5 shadow-inner"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-base font-black italic uppercase text-foreground leading-none tracking-tight">
                                                    Action: {req.actionType.toUpperCase()}
                                                </p>
                                                <p className="text-xs text-foreground/60">Requester: {req.requesterName} // Job ID: {req.payload?.jobId}</p>
                                                <p className="text-xs text-foreground/60">Reason: {req.reason || 'No description provided'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleApprovalDecision(req.id, 'approved')}
                                                    className="px-6 py-2.5 rounded-full bg-green-500 hover:bg-green-600 text-white font-black text-xs uppercase tracking-wider transition-all"
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    onClick={() => handleApprovalDecision(req.id, 'rejected')}
                                                    className="px-6 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider transition-all"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Exceptions Log */}
                    <Card className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden ring-1 ring-white/5">
                        <CardHeader className="p-10">
                            <CardTitle className="text-sm font-black italic tracking-[0.3em] uppercase text-primary">Financial Exception Incidents</CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                            <div className="space-y-4">
                                {exceptions.length === 0 ? (
                                    <p className="text-foreground/50 text-sm italic py-4">No financial exceptions raised.</p>
                                ) : (
                                    exceptions.map((exc, index) => (
                                        <div 
                                            key={exc.id || index}
                                            className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-[2rem] bg-background/25 border border-white/5 shadow-inner"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-base font-black italic uppercase text-red-400 leading-none tracking-tight">{exc.type.toUpperCase()}</p>
                                                <p className="text-xs text-foreground/70">Txn: {exc.transactionId} // Status: {exc.status}</p>
                                                <p className="text-xs text-foreground/50">{exc.notes}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-foreground/40">Risk Value</p>
                                                <p className="text-sm font-mono text-white">Expected: {exc.amountExpected} / Actual: {exc.amountActual} INR</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: AUDIT LOG INTEGRITY VERIFIER */}
            {activeTab === 'audit' && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <Card className="bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden ring-1 ring-white/5">
                        <CardHeader className="p-10">
                            <CardTitle className="text-xl font-black italic tracking-widest uppercase text-primary flex items-center gap-3">
                                <ShieldCheck className="h-6 w-6 text-primary" /> Tamper-Evident Audit Chain Verifier
                            </CardTitle>
                            <CardDescription className="text-foreground/60">
                                Verify cryptographic integrity of platform administrative records. Iterates rolling SHA-256 hashes sequentially to isolate log modifications.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-0 space-y-6">
                            <div className="flex justify-center py-6">
                                <button 
                                    onClick={handleVerifyAudit}
                                    disabled={verifyingAudit}
                                    className="px-12 py-4 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-black italic tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50"
                                >
                                    {verifyingAudit ? 'Verifying Blockchain Chain...' : 'Run Integrity Diagnostic'}
                                </button>
                            </div>

                            {auditStatus && (
                                <div className="p-8 rounded-[2rem] border border-white/5 bg-background/40 backdrop-blur-md space-y-4">
                                    <div className="flex items-center gap-3">
                                        {auditStatus.verified ? (
                                            <>
                                                <CheckCircle className="h-6 w-6 text-green-400" />
                                                <h3 className="text-base font-black italic uppercase tracking-wider text-green-400">Diagnostic Passed: Chain Intact</h3>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-6 w-6 text-red-500" />
                                                <h3 className="text-base font-black italic uppercase tracking-wider text-red-500">TAMPERING DETECTED! COMPROMISED CHAIN</h3>
                                            </>
                                        )}
                                    </div>
                                    
                                    <div className="grid gap-4 md:grid-cols-2 pt-2 text-xs">
                                        <div className="space-y-1">
                                            <p className="text-foreground/50 uppercase tracking-widest">Logs Scanned</p>
                                            <p className="font-mono text-sm text-white">{auditStatus.count} logs verified</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-foreground/50 uppercase tracking-widest">Global Checkpoint Hash</p>
                                            <p className="font-mono text-sm text-white truncate">{auditStatus.checkpointHash || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {!auditStatus.verified && auditStatus.tamperedLogs && (
                                        <div className="pt-4 border-t border-white/5 space-y-2">
                                            <p className="text-xs font-black uppercase text-red-400">Compromised Document ID Entries:</p>
                                            <ul className="list-disc pl-5 space-y-1 text-xs text-red-400/80 font-mono">
                                                {auditStatus.tamperedLogs.map((logId: string) => (
                                                    <li key={logId}>{logId}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
