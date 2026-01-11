
"use client";

import React from 'react';
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, TrendingUp, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, limit, getCountFromServer, doc, updateDoc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AdminAlert {
    id: string;
    level: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    timestamp: any;
    read: boolean;
    metadata?: any;
}

export default function AdminClient() {
    const { user, role, loading } = useUser();
    const { db } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const [alerts, setAlerts] = React.useState<AdminAlert[]>([]);
    const [metrics, setMetrics] = React.useState({
        activeJobs: 0,
        openDisputes: 0,
        totalUsers: 0
    });
    const [statsLoading, setStatsLoading] = React.useState(true);

    // 1. Authorization Guard
    React.useEffect(() => {
        if (!loading && (!user || !user.roles.includes('Admin'))) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    // 2. Fetch Metrics
    React.useEffect(() => {
        if (!db || !user || !user.roles.includes('Admin')) return;

        const fetchMetrics = async () => {
            try {
                const jobsColl = collection(db, 'jobs');
                const usersColl = collection(db, 'users');
                const disputesColl = collection(db, 'disputes');

                // Active Jobs
                const activeJobsQuery = query(jobsColl, where("status", "in", ["In Progress", "Pending Confirmation", "Pending Funding"]));
                const activeJobsSnap = await getCountFromServer(activeJobsQuery);

                // Open Disputes
                const disputesQuery = query(disputesColl, where("status", "==", "Open"));
                const disputesSnap = await getCountFromServer(disputesQuery);

                // Total Users
                const usersSnap = await getCountFromServer(usersColl);

                setMetrics({
                    activeJobs: activeJobsSnap.data().count,
                    openDisputes: disputesSnap.data().count,
                    totalUsers: usersSnap.data().count
                });
            } catch (error) {
                console.error("Failed to fetch admin metrics", error);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchMetrics();
    }, [db, user]);

    // 3. Live Alerts Feed
    React.useEffect(() => {
        if (!db || !user || !user.roles.includes('Admin')) return;

        const alertsRef = collection(db, 'admin_alerts');
        const q = query(alertsRef, orderBy('timestamp', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminAlert));
            setAlerts(newAlerts);
        });

        return () => unsubscribe();
    }, [db, user]);

    const markAsRead = async (alertId: string) => {
        if (!db) return;
        await updateDoc(doc(db, 'admin_alerts', alertId), { read: true });
    };

    const handleResolve = async (jobId: string, resolution: 'REFUND' | 'RELEASE' | 'SPLIT', alertId: string, splitPercentage?: number) => {
        if (!user) return;
        const confirmMsg = resolution === 'SPLIT'
            ? `Are you sure you want to SPLIT funds (50/50 payment & refund) for Job ${jobId}?`
            : `Are you sure you want to ${resolution} funds for Job ${jobId}? This Action is irreversible.`;

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
                body: JSON.stringify({ jobId, resolution, splitPercentage, disputeId: null }) // Dispute ID ideally comes from metadata
            });
            await markAsRead(alertId);
            toast({
                title: "Success",
                description: "Resolution processed successfully.",
                variant: "default"
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Resolution Failed",
                description: "Failed to process resolution. Check logs.",
                variant: "destructive"
            });
        }
    };

    if (loading || (user && !user.roles.includes('Admin'))) {
        return <div className="flex bg-muted/20 h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container py-8 space-y-8 max-w-full overflow-x-hidden px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Command Center</h1>
                    <p className="text-muted-foreground">Platform health, alerts, and operational metrics.</p>
                </div>
                <Badge variant="outline" className="px-4 py-1 text-sm bg-background">
                    Live Mode
                </Badge>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.activeJobs}</div>
                        <p className="text-xs text-muted-foreground">Currently operational</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{statsLoading ? "..." : metrics.openDisputes}</div>
                        <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statsLoading ? "..." : metrics.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Registered on platform</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts Feed */}
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Live Safety Alerts</CardTitle>
                    <CardDescription>Real-time log of high-value transactions, disputes, and security events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {alerts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No alerts recorded. System is quiet.</div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`flex items-start justify-between p-4 rounded-lg border ${alert.level === 'CRITICAL' ? 'bg-red-50 border-red-200 dark:bg-red-950/20' : alert.read ? 'bg-background' : 'bg-blue-50 border-blue-100 dark:bg-blue-950/20'}`}>
                                    <div className="flex gap-4">
                                        <div className={`mt-1 p-2 rounded-full ${alert.level === 'CRITICAL' ? 'bg-red-100 text-red-600' : alert.level === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {alert.level === 'CRITICAL' ? <ShieldAlert className="h-4 w-4" /> : alert.level === 'WARNING' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {alert.message}
                                                {alert.read && <span className="ml-2 text-xs text-muted-foreground font-normal">(Read)</span>}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {alert.timestamp ? formatDistanceToNow(new Date((alert.timestamp as any).toDate ? (alert.timestamp as any).toDate() : alert.timestamp), { addSuffix: true }) : 'Just now'}
                                                {alert.metadata?.jobId && (
                                                    <span className="cursor-pointer hover:underline text-blue-600" onClick={() => router.push(`/dashboard/jobs/${alert.metadata.jobId}`)}>
                                                        • Job ID: {alert.metadata.jobId}
                                                    </span>
                                                )}
                                                {alert.metadata?.refundAmount && (
                                                    <span>• Amount: ₹{alert.metadata.refundAmount}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {!alert.read && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                {alert.metadata?.jobId && (
                                                    <>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs border-green-200 hover:bg-green-50 text-green-700" onClick={() => handleResolve(alert.metadata.jobId, 'RELEASE', alert.id)}>
                                                            Release
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs border-red-200 hover:bg-red-50 text-red-700" onClick={() => handleResolve(alert.metadata.jobId, 'REFUND', alert.id)}>
                                                            Refund
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs border-blue-200 hover:bg-blue-50 text-blue-700" onClick={() => handleResolve(alert.metadata.jobId, 'SPLIT', alert.id, 50)}>
                                                            Split 50/50
                                                        </Button>
                                                    </>
                                                )}
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAsRead(alert.id)}>Mark Read</Button>
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
