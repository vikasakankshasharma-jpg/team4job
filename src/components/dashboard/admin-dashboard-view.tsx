"use client";

import React from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useTranslations } from 'next-intl';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Users,
    Briefcase,
    AlertOctagon,
    IndianRupee,
} from "lucide-react";
import { useHelp } from "@/hooks/use-help";
import { Transaction, User, Job } from "@/lib/types";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { toDate } from "@/lib/utils";
import { format, subMonths, startOfMonth } from "date-fns";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/dashboard/cards/stat-card";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { Avatar } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { FinancialSummaryCard } from "@/components/dashboard/cards/financial-summary-card";
import { TopPerformersCard } from "@/components/dashboard/cards/top-performers-card";
import { JOB_STATUS, TRANSACTION_STATUS, DISPUTE_STATUS, USER_ROLES } from "@/lib/constants/statuses";

const AdminRevenueChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminRevenueChart), { ssr: false });
const AdminSystemHealthChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminSystemHealthChart), { ssr: false });
const AdminUserGrowthChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminUserGrowthChart), { ssr: false });

export function AdminDashboardView() {
    const { db } = useFirebase();
    const { setHelp } = useHelp();
    const t = useTranslations('dashboard');
    const [stats, setStats] = React.useState({ totalUsers: 0, totalJobs: 0, openDisputes: 0, totalValueReleased: 0 });
    const [loading, setLoading] = React.useState(true);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [allUsers, setAllUsers] = React.useState<User[]>([]);
    const [allJobs, setAllJobs] = React.useState<Job[]>([]);

    React.useEffect(() => {
        const unsubscribeFuncs: (() => void)[] = [];

        async function setupListeners() {
            if (!db) return;
            setLoading(true);

            const usersRef = collection(db, "users");
            const jobsRef = collection(db, "jobs");
            const disputesRef = collection(db, "disputes");
            const transactionsRef = collection(db, "transactions");

            // 1. Users Listener (Limited for safety, but ideal admin needs advanced pagination)
            const unsubUsers = onSnapshot(query(usersRef, limit(500)), (snap) => { // Capped at 500 for demo dashboard performance
                const users = snap.docs.map(d => d.data() as User);
                setAllUsers(users);
                setStats(prev => ({ ...prev, totalUsers: snap.size })); // Note: this is size of fetched, not total on server if > 500
            }, (error) => console.error("AdminDashboardView: Users listener error", error));
            unsubscribeFuncs.push(unsubUsers);

            // 2. Jobs Listener
            const unsubJobs = onSnapshot(query(jobsRef, limit(500)), (snap) => {
                const jobs = snap.docs.map(d => d.data() as Job);
                setAllJobs(jobs);
                setStats(prev => ({ ...prev, totalJobs: snap.size }));
            }, (error) => console.error("AdminDashboardView: Jobs listener error", error));
            unsubscribeFuncs.push(unsubJobs);

            // 3. Disputes
            const unsubDisputes = onSnapshot(query(disputesRef), (snap) => {
                const openCount = snap.docs.filter(d => d.data().status === DISPUTE_STATUS.OPEN).length;
                setStats(prev => ({ ...prev, openDisputes: openCount }));
            }, (error) => console.error("AdminDashboardView: Disputes listener error", error));
            unsubscribeFuncs.push(unsubDisputes);

            // 4. Transactions
            const unsubTx = onSnapshot(query(transactionsRef, limit(200)), (snap) => {
                const txs = snap.docs.map(d => d.data() as Transaction);
                setTransactions(txs);
                const total = txs.reduce((acc, t) => acc + t.amount, 0);
                const released = txs.filter(t => t.status === TRANSACTION_STATUS.RELEASED).reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);
                const commission = txs.reduce((acc, t) => acc + (t.commission || 0), 0);
                setStats(prev => ({ ...prev, totalValueReleased: released }));
            }, (error) => console.error("AdminDashboardView: Transactions listener error", error));
            unsubscribeFuncs.push(unsubTx);

            setLoading(false);
        }

        setupListeners();

        return () => {
            unsubscribeFuncs.forEach(unsub => unsub());
        };
    }, [db]);

    React.useEffect(() => {
        setHelp({
            title: t('admin.guide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('admin.guide.welcome')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">{t('admin.guide.totalUsers')}</span></li>
                        <li><span className="font-semibold">{t('admin.guide.totalJobs')}</span></li>
                        <li><span className="font-semibold">{t('admin.guide.openDisputes')}</span></li>
                        <li><span className="font-semibold">{t('admin.guide.valueReleased')}</span></li>
                        <li><span className="font-semibold">{t('admin.guide.financialSummary')}</span></li>
                        <li><span className="font-semibold">{t('admin.guide.topPerformers')}</span></li>
                        <li><span className="font-semibold">{t('admin.guide.userGrowth')}</span></li>
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
            return { name: monthName, Installers: 0, "Job Givers": 0 };
        }).reverse();

        (allUsers || []).forEach(user => {
            if (!user.memberSince) return;

            const joinDate = toDate(user.memberSince);
            if (joinDate > subMonths(now, 6)) {
                const monthName = format(joinDate, 'MMM');
                const monthData = data.find(m => m.name === monthName);
                if (monthData) {
                    if (user.roles?.includes(USER_ROLES.INSTALLER)) monthData.Installers++;
                    if (user.roles?.includes(USER_ROLES.JOB_GIVER)) monthData["Job Givers"]++;
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
                    const fee = t.jobGiverFee || 0;
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

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">{t('admin.welcome')}</h1>
            <div className="space-y-6">
                <FinancialSummaryCard transactions={transactions} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title={t('admin.totalUsers')} value={stats.totalUsers} icon={Users} href="/dashboard/users" iconBgColor="bg-blue-500" iconColor="text-white" />
                    <StatCard title={t('admin.totalJobs')} value={stats.totalJobs} icon={Briefcase} href="/dashboard/all-jobs" iconBgColor="bg-purple-500" iconColor="text-white" />
                    <StatCard title={t('admin.openDisputes')} value={stats.openDisputes} icon={AlertOctagon} href="/dashboard/disputes" iconBgColor="bg-red-500" iconColor="text-white" />
                    <StatCard title={t('admin.valueReleased')} value={`₹${stats.totalValueReleased.toLocaleString()}`} icon={IndianRupee} href="/dashboard/transactions" iconBgColor="bg-green-500" iconColor="text-white" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AdminRevenueChart data={revenueData} totalRevenue={totalRevenue} />

                    <AdminSystemHealthChart data={jobHealthData} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-1">
                        {/* Recent Signups or Activity - simplified to Card structure for safety */}
                        <Card>
                            <CardHeader><CardTitle>{t('admin.recentSignups')}</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[...allUsers].sort((a, b) => toDate(b.memberSince).getTime() - toDate(a.memberSince).getTime()).slice(0, 5).filter(u => u.id).map((u, index) => (
                                        <div key={u.id || `user-${index}`} className="flex items-center gap-4">
                                            <Avatar className="h-8 w-8"><AnimatedAvatar svg={u.avatarUrl} /></Avatar>
                                            <div><p className="text-sm font-medium">{u.name || t('admin.unknownUser')}</p><p className="text-xs text-muted-foreground">{u.roles?.join(', ') || 'User'}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <TopPerformersCard installers={(allUsers || []).filter(u => Array.isArray(u.roles) && u.roles.includes(USER_ROLES.INSTALLER))} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <AdminUserGrowthChart data={userGrowthData} />
                </div>
            </div>
        </div>
    );
}
