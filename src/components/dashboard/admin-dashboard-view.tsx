"use client";

import React from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
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

const AdminRevenueChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminRevenueChart), { ssr: false });
const AdminSystemHealthChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminSystemHealthChart), { ssr: false });
const AdminUserGrowthChart = dynamic(() => import("@/components/dashboard/charts/admin-charts").then(mod => mod.AdminUserGrowthChart), { ssr: false });

export function AdminDashboardView() {
    const { db } = useFirebase();
    const { setHelp } = useHelp();
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
            });
            unsubscribeFuncs.push(unsubUsers);

            // 2. Jobs Listener
            const unsubJobs = onSnapshot(query(jobsRef, limit(500)), (snap) => {
                const jobs = snap.docs.map(d => d.data() as Job);
                setAllJobs(jobs);
                setStats(prev => ({ ...prev, totalJobs: snap.size }));
            });
            unsubscribeFuncs.push(unsubJobs);

            // 3. Disputes
            const unsubDisputes = onSnapshot(query(disputesRef), (snap) => {
                const openCount = snap.docs.filter(d => d.data().status === 'Open').length;
                setStats(prev => ({ ...prev, openDisputes: openCount }));
            });
            unsubscribeFuncs.push(unsubDisputes);

            // 4. Transactions
            const unsubTx = onSnapshot(query(transactionsRef, limit(200)), (snap) => {
                const txs = snap.docs.map(d => d.data() as Transaction);
                setTransactions(txs);
                const released = txs.filter(t => t.status === 'Released').reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);
                setStats(prev => ({ ...prev, totalValueReleased: released }));
            });
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
            title: 'Admin Dashboard Guide',
            content: (
                <div className="space-y-4 text-sm">
                    <p>Welcome, Admin. This dashboard provides a high-level overview of the entire platform.</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">Total Users:</span> The total number of registered users.</li>
                        <li><span className="font-semibold">Total Jobs:</span> The total number of jobs created.</li>
                        <li><span className="font-semibold">Open Disputes:</span> Active disputes requiring review.</li>
                        <li><span className="font-semibold">Value Released:</span> Total monetary value released to installers.</li>
                        <li><span className="font-semibold">Financial Summary:</span> Real-time platform revenue and funds held.</li>
                        <li><span className="font-semibold">Top Performers:</span> Leaderboard of best installers (Last Month).</li>
                        <li><span className="font-semibold">User Growth:</span> New user sign-ups chart (6 Months).</li>
                    </ul>
                </div>
            )
        });
    }, [setHelp]);

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
                    if (user.roles?.includes('Installer')) monthData.Installers++;
                    if (user.roles?.includes('Job Giver')) monthData["Job Givers"]++;
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

        (transactions || []).forEach(t => {
            if (t.status === 'Released' && t.releasedAt) {
                const date = toDate(t.releasedAt);
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
            color: status === 'Completed' ? '#00C49F' : status === 'In Progress' ? '#0088FE' : status === 'Open for Bidding' ? '#FFBB28' : '#FF8042'
        }));

        return { revenueData: months, jobHealthData };
    }, [allJobs, transactions]);

    const totalRevenue = revenueData.reduce((acc, m) => acc + m.revenue, 0);

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, Admin!</h1>
            <div className="space-y-6">
                <FinancialSummaryCard transactions={transactions} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Total Users" value={stats.totalUsers} icon={Users} href="/dashboard/users" iconBgColor="bg-blue-500" iconColor="text-white" />
                    <StatCard title="Total Jobs" value={stats.totalJobs} icon={Briefcase} href="/dashboard/all-jobs" iconBgColor="bg-purple-500" iconColor="text-white" />
                    <StatCard title="Open Disputes" value={stats.openDisputes} icon={AlertOctagon} href="/dashboard/disputes" iconBgColor="bg-red-500" iconColor="text-white" />
                    <StatCard title="Value Released" value={`₹${stats.totalValueReleased.toLocaleString()}`} icon={IndianRupee} href="/dashboard/transactions" iconBgColor="bg-green-500" iconColor="text-white" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AdminRevenueChart data={revenueData} totalRevenue={totalRevenue} />

                    <AdminSystemHealthChart data={jobHealthData} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-1">
                        {/* Recent Signups or Activity - simplified to Card structure for safety */}
                        <Card>
                            <CardHeader><CardTitle>Recent Signups</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[...allUsers].sort((a, b) => toDate(b.memberSince).getTime() - toDate(a.memberSince).getTime()).slice(0, 5).filter(u => u.id).map((u, index) => (
                                        <div key={u.id || `user-${index}`} className="flex items-center gap-4">
                                            <Avatar className="h-8 w-8"><AnimatedAvatar svg={u.avatarUrl} /></Avatar>
                                            <div><p className="text-sm font-medium">{u.name || 'Unknown User'}</p><p className="text-xs text-muted-foreground">{u.roles?.join(', ') || 'User'}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <TopPerformersCard installers={(allUsers || []).filter(u => Array.isArray(u.roles) && u.roles.includes('Installer'))} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <AdminUserGrowthChart data={userGrowthData} />
                </div>
            </div>
        </div>
    );
}
