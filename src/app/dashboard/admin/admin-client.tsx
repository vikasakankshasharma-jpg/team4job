
"use client";

import React from 'react';
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, TrendingUp, Users, AlertTriangle, CheckCircle, Clock, UserPlus, Briefcase, FileText, Activity, Zap, CheckCircle2, Filter } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, limit, getCountFromServer, doc, updateDoc, Timestamp } from "firebase/firestore";
import { formatDistanceToNow, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { JOB_STATUS, TRANSACTION_STATUS, DISPUTE_STATUS, USER_ROLES } from "@/lib/constants/statuses";

interface AdminAlert {
    id: string;
    level: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    timestamp: any;
    read: boolean;
    metadata?: any;
}

interface PlatformMetrics {
    activeJobs: number;
    openDisputes: number;
    totalUsers: number;
    newUsersToday: number;
    newJobsToday: number;
    newJobsThisWeek: number;
    completedJobsThisWeek: number;
}

interface QuickAction {
    label: string;
    icon: React.ElementType;
    href: string;
    description: string;
    variant: 'default' | 'outline';
}


export default function AdminClient() {
    const t = useTranslations('admin');
    const quickActions: QuickAction[] = [
        { label: t('viewUsers'), icon: Users, href: '/dashboard/users', description: t('manageUsers'), variant: 'outline' },
        { label: t('allJobsLabel'), icon: Briefcase, href: '/dashboard/all-jobs', description: t('monitorJobs'), variant: 'outline' },
        { label: t('disputes'), icon: ShieldAlert, href: '/dashboard/disputes', description: t('resolveDisputes'), variant: 'outline' },
        { label: t('reports'), icon: FileText, href: '/dashboard/reports', description: t('viewAnalytics'), variant: 'outline' },
    ];
    const { user, role, loading } = useUser();
    const { db } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const [alerts, setAlerts] = React.useState<AdminAlert[]>([]);
    const [filteredAlerts, setFilteredAlerts] = React.useState<AdminAlert[]>([]);
    const [alertFilter, setAlertFilter] = React.useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL' | 'UNREAD'>('ALL');
    const [metrics, setMetrics] = React.useState<PlatformMetrics>({
        activeJobs: 0,
        openDisputes: 0,
        totalUsers: 0,
        newUsersToday: 0,
        newJobsToday: 0,
        newJobsThisWeek: 0,
        completedJobsThisWeek: 0,
    });
    const [statsLoading, setStatsLoading] = React.useState(true);
    const [platformHealth, setPlatformHealth] = React.useState({
        firebase: 'operational',
        overall: 'healthy'
    });

    // 1. Authorization Guard
    React.useEffect(() => {
        if (!loading && (!user || !user.roles.includes(USER_ROLES.ADMIN))) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    // 2. Fetch Enhanced Metrics
    React.useEffect(() => {
        if (!db || !user || !user.roles.includes(USER_ROLES.ADMIN)) return;

        const fetchMetrics = async () => {
            try {
                const jobsColl = collection(db, 'jobs');
                const usersColl = collection(db, 'users');
                const disputesColl = collection(db, 'disputes');

                const todayStart = Timestamp.fromDate(startOfDay(new Date()));
                const weekStart = Timestamp.fromDate(startOfWeek(new Date()));
                const monthStart = Timestamp.fromDate(startOfMonth(new Date()));

                // Active Jobs
                const activeJobsQuery = query(jobsColl, where("status", "in", [JOB_STATUS.IN_PROGRESS, JOB_STATUS.PENDING_CONFIRMATION, JOB_STATUS.PENDING_FUNDING]));
                const activeJobsSnap = await getCountFromServer(activeJobsQuery);

                // Open Disputes
                const disputesQuery = query(disputesColl, where("status", "==", DISPUTE_STATUS.OPEN));
                const disputesSnap = await getCountFromServer(disputesQuery);

                // Total Users
                const usersSnap = await getCountFromServer(usersColl);

                // New Users Today
                const newUsersTodayQuery = query(usersColl, where("memberSince", ">=", todayStart));
                const newUsersTodaySnap = await getCountFromServer(newUsersTodayQuery);

                // New Jobs Today
                const newJobsTodayQuery = query(jobsColl, where("createdAt", ">=", todayStart));
                const newJobsTodaySnap = await getCountFromServer(newJobsTodayQuery);

                // New Jobs This Week
                const newJobsWeekQuery = query(jobsColl, where("createdAt", ">=", weekStart));
                const newJobsWeekSnap = await getCountFromServer(newJobsWeekQuery);

                // Completed Jobs This Week
                const completedJobsWeekQuery = query(jobsColl, where("status", "==", JOB_STATUS.COMPLETED), where("updatedAt", ">=", weekStart));
                const completedJobsWeekSnap = await getCountFromServer(completedJobsWeekQuery);

                setMetrics({
                    activeJobs: activeJobsSnap.data().count,
                    openDisputes: disputesSnap.data().count,
                    totalUsers: usersSnap.data().count,
                    newUsersToday: newUsersTodaySnap.data().count,
                    newJobsToday: newJobsTodaySnap.data().count,
                    newJobsThisWeek: newJobsWeekSnap.data().count,
                    completedJobsThisWeek: completedJobsWeekSnap.data().count,
                });

                // Platform health check (simplified - all operational if we got here)
                setPlatformHealth({
                    firebase: 'operational',
                    overall: 'healthy'
                });
            } catch (error) {
                console.error("Failed to fetch admin metrics", error);
                setPlatformHealth({
                    firebase: 'degraded',
                    overall: 'issues'
                });
            } finally {
                setStatsLoading(false);
            }
        };

        fetchMetrics();
    }, [db, user]);

    // 3. Live Alerts Feed
    React.useEffect(() => {
        if (!db || !user || !user.roles.includes(USER_ROLES.ADMIN)) return;

        const alertsRef = collection(db, 'admin_alerts');
        const q = query(alertsRef, orderBy('timestamp', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminAlert));
            setAlerts(newAlerts);
        });

        return () => unsubscribe();
    }, [db, user]);

    // 4. Filter Alerts
    React.useEffect(() => {
        let filtered = alerts;

        if (alertFilter === 'UNREAD') {
            filtered = alerts.filter(a => !a.read);
        } else if (alertFilter !== 'ALL') {
            filtered = alerts.filter(a => a.level === alertFilter);
        }

        setFilteredAlerts(filtered);
    }, [alerts, alertFilter]);

    const markAsRead = async (alertId: string) => {
        if (!db) return;
        await updateDoc(doc(db, 'admin_alerts', alertId), { read: true });
    };

    const markAllAsRead = async () => {
        if (!db) return;
        const unreadAlerts = alerts.filter(a => !a.read);
        await Promise.all(unreadAlerts.map(alert =>
            updateDoc(doc(db, 'admin_alerts', alert.id), { read: true })
        ));
        toast({
            title: t('success'),
            description: t('alertsMarkedRead', { count: unreadAlerts.length }),
            variant: "default"
        });
    };

    const handleResolve = async (jobId: string, resolution: 'REFUND' | 'RELEASE' | 'SPLIT', alertId: string, splitPercentage?: number) => {
        if (!user) return;
        const confirmMsg = resolution === 'SPLIT'
            ? t('confirmSplit', { id: jobId })
            : t('confirmAction', { resolution, id: jobId });

        if (!window.confirm(confirmMsg)) return;

        try {
            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("No Auth Token");

            await fetch('/api/escrow/resolve-dispute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ jobId, resolution, splitPercentage, disputeId: null })
            });
            await markAsRead(alertId);
            toast({
                title: t('success'),
                description: t('resolutionSuccess'),
                variant: "default"
            });
        } catch (error) {
            console.error(error);
            toast({
                title: t('resolutionFailed'),
                description: t('resolutionFailedDesc'),
                variant: "destructive"
            });
        }
    };

    if (loading || (user && !user.roles.includes(USER_ROLES.ADMIN))) {
        return <div className="flex bg-muted/20 h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const unreadCount = alerts.filter(a => !a.read).length;

    return (
        <div className="container py-8 space-y-8 max-w-full overflow-x-hidden px-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={platformHealth.overall === 'healthy' ? 'default' : 'destructive'}
                        className="px-4 py-1 text-sm"
                    >
                        <Activity className="h-3 w-3 mr-1" />
                        {platformHealth.overall === 'healthy' ? t('allSystemsOperational') : t('systemIssuesDetected')}
                    </Badge>
                </div>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        {t('quickActions')}
                    </CardTitle>
                    <CardDescription>{t('commonTasks')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {quickActions.map((action) => (
                            <Link key={action.href} href={action.href}>
                                <Button
                                    variant={action.variant}
                                    className="w-full h-auto flex-col items-start p-4 space-y-2"
                                >
                                    <action.icon className="h-5 w-5" />
                                    <div className="text-left">
                                        <div className="font-semibold text-sm">{action.label}</div>
                                        <div className="text-xs text-muted-foreground font-normal">{action.description}</div>
                                    </div>
                                </Button>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Primary Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('activeJobs')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.activeJobs}</div>
                        <p className="text-xs text-muted-foreground">{t('currentlyOperational')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('openDisputes')}</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{statsLoading ? "..." : metrics.openDisputes}</div>
                        <p className="text-xs text-muted-foreground">{t('requireAttention')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">{t('registeredPlatform')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Time-Based Activity Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('newUsersToday')}</CardTitle>
                        <UserPlus className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.newUsersToday}</div>
                        <p className="text-xs text-muted-foreground">{t('sinceMidnight')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('jobsPostedToday')}</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.newJobsToday}</div>
                        <p className="text-xs text-muted-foreground">{t('last24Hours')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('jobsThisWeek')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.newJobsThisWeek}</div>
                        <p className="text-xs text-muted-foreground">{t('postedThisWeek')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('completedThisWeek')}</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.completedJobsThisWeek}</div>
                        <p className="text-xs text-muted-foreground">{t('jobsFinished')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts Feed */}
            <Card className="col-span-3">
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {t('liveSafetyAlerts')}
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="ml-2">{t('unread', { count: unreadCount })}</Badge>
                                )}
                            </CardTitle>
                            <CardDescription>{t('alertsDescription')}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={alertFilter} onValueChange={(value: any) => setAlertFilter(value)}>
                                <SelectTrigger className="w-[160px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">{t('allAlerts')}</SelectItem>
                                    <SelectItem value="UNREAD">{t('unreadOnly')}</SelectItem>
                                    <SelectItem value="CRITICAL">{t('critical')}</SelectItem>
                                    <SelectItem value="WARNING">{t('warning')}</SelectItem>
                                    <SelectItem value="INFO">{t('info')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {unreadCount > 0 && (
                                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t('markAllRead')}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {filteredAlerts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {alertFilter === 'ALL' ? t('noAlerts') : t('noFilterAlerts', { filter: alertFilter.toLowerCase() })}
                            </div>
                        ) : (
                            filteredAlerts.map(alert => (
                                <div key={alert.id} className={`flex items-start justify-between p-4 rounded-lg border ${alert.level === 'CRITICAL' ? 'bg-red-50 border-red-200 dark:bg-red-950/20' : alert.read ? 'bg-background' : 'bg-blue-50 border-blue-100 dark:bg-blue-950/20'}`}>
                                    <div className="flex gap-4">
                                        <div className={`mt-1 p-2 rounded-full ${alert.level === 'CRITICAL' ? 'bg-red-100 text-red-600' : alert.level === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {alert.level === 'CRITICAL' ? <ShieldAlert className="h-4 w-4" /> : alert.level === 'WARNING' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {alert.message}
                                                {alert.read && <span className="ml-2 text-xs text-muted-foreground font-normal">{t('read')}</span>}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                                <Clock className="h-3 w-3" />
                                                {alert.timestamp ? formatDistanceToNow(new Date((alert.timestamp as any).toDate ? (alert.timestamp as any).toDate() : alert.timestamp), { addSuffix: true }) : t('justNow')}
                                                {alert.metadata?.jobId && (
                                                    <Button variant="link" className="p-0 h-auto font-normal text-xs text-blue-600 hover:underline" onClick={() => router.push(`/dashboard/jobs/${alert.metadata.jobId}`)}>
                                                        • {t('jobId', { id: alert.metadata.jobId })}
                                                    </Button>
                                                )}
                                                {alert.metadata?.refundAmount && (
                                                    <span>• {t('amount', { amount: alert.metadata.refundAmount })}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {!alert.read && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2 flex-wrap">
                                                {alert.metadata?.jobId && (
                                                    <>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs border-green-200 hover:bg-green-50 text-green-700" onClick={() => handleResolve(alert.metadata.jobId, 'RELEASE', alert.id)}>
                                                            {t('release')}
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs border-red-200 hover:bg-red-50 text-red-700" onClick={() => handleResolve(alert.metadata.jobId, 'REFUND', alert.id)}>
                                                            {t('refund')}
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs border-blue-200 hover:bg-blue-50 text-blue-700" onClick={() => handleResolve(alert.metadata.jobId, 'SPLIT', alert.id, 50)}>
                                                            {t('split')}
                                                        </Button>
                                                    </>
                                                )}
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAsRead(alert.id)}>{t('markRead')}</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
