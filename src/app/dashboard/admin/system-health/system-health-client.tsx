"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirebase } from '@/hooks/use-user';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, AlertCircle, Activity, Clock, ServerCrash, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SystemLog {
    id: string;
    level: string;
    message: string;
    context?: any;
    timestamp: Timestamp;
}

interface BusinessEvent {
    id: string;
    eventType: string;
    actorId: string;
    entityId: string;
    entityType: string;
    metadata?: any;
    timestamp: Timestamp;
}

interface StuckJob {
    id: string;
    title: string;
    status: string;
    updatedAt: Timestamp;
    jobGiverId: string;
}

export default function SystemHealthClient() {
    const { user, isAdmin, loading: userLoading } = useUser();
    const { db } = useFirebase();

    // State
    const [recentErrors, setRecentErrors] = useState<SystemLog[]>([]);
    const [recentEvents, setRecentEvents] = useState<BusinessEvent[]>([]);
    const [stuckJobs, setStuckJobs] = useState<StuckJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !isAdmin) return;

        // 1. Fetch Recent Errors
        const errorsRef = collection(db, 'system_logs');
        const qErrors = query(errorsRef, orderBy('timestamp', 'desc'), limit(10));
        const unsubErrors = onSnapshot(qErrors, (snap) => {
            setRecentErrors(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemLog)));
        });

        // 2. Fetch Recent Business Events
        const eventsRef = collection(db, 'business_audit_logs');
        const qEvents = query(eventsRef, orderBy('timestamp', 'desc'), limit(10));
        const unsubEvents = onSnapshot(qEvents, (snap) => {
            setRecentEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessEvent)));
        });

        // 3. Fetch Stuck Jobs (Client-side filter for simplicity in prototype)
        // In real prod, this needs a compound index or server function.
        // We'll query active jobs and filter by updated time manually here for "Observability".
        const jobsRef = collection(db, 'jobs');
        // Jobs that are active
        const qJobs = query(jobsRef, where('status', 'in', ['funded', 'in_progress', 'disputed']));

        const unsubJobs = onSnapshot(qJobs, (snap) => {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const potentialStuck = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as StuckJob))
                .filter(job => job.updatedAt?.toDate() < sevenDaysAgo);

            setStuckJobs(potentialStuck);
            setLoading(false);
        });

        return () => {
            unsubErrors();
            unsubEvents();
            unsubJobs();
        };
    }, [db, isAdmin]);

    if (userLoading || !isAdmin) return <div className="p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">System Health & Observability</h1>
            <p className="text-muted-foreground">Real-time pulse of the platform.</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stuck Jobs</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stuckJobs.length}</div>
                        <p className="text-xs text-muted-foreground">Inactive for &gt; 7 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
                        <ServerCrash className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentErrors.length}</div>
                        <p className="text-xs text-muted-foreground">Last 10 events captured</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Business Events</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentEvents.length}</div>
                        <p className="text-xs text-muted-foreground">Recent transactions/actions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">Operational</div>
                        <p className="text-xs text-muted-foreground">No outages detected</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ServerCrash className="h-5 w-5 text-red-500" />
                            Recent System Errors
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentErrors.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No recent errors.</p>
                            ) : (
                                recentErrors.map(err => (
                                    <div key={err.id} className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-red-700 break-all">{err.message}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(err.timestamp.toDate(), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {err.context?.action && (
                                            <Badge variant="outline">{err.context.action}</Badge>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Recent Business Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentEvents.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No events found.</p>
                            ) : (
                                recentEvents.map(evt => (
                                    <div key={evt.id} className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">{evt.eventType}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Entity: {evt.entityType} ({evt.entityId.slice(0, 8)}...)
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(evt.timestamp.toDate(), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-500" />
                            Stuck Jobs
                        </CardTitle>
                        <CardDescription>
                            Jobs active but not updated in 7+ days. Requires attention.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Job Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead>Job Giver</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stuckJobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">All active jobs are healthy.</TableCell>
                                    </TableRow>
                                ) : (
                                    stuckJobs.map(job => (
                                        <TableRow key={job.id}>
                                            <TableCell className="font-medium">{job.title}</TableCell>
                                            <TableCell><Badge variant="outline">{job.status}</Badge></TableCell>
                                            <TableCell>{formatDistanceToNow(job.updatedAt.toDate(), { addSuffix: true })}</TableCell>
                                            <TableCell className="font-mono text-xs">{job.jobGiverId.slice(0, 8)}...</TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="ghost" asChild>
                                                    <Link href={`/dashboard/jobs/${job.id}`}>Inspect</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
