"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, AlertCircle, Clock, CheckCircle2, ChevronRight, User, MapPin } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { listDealerJobsAction } from '@/app/actions/job.actions';
import { useUser } from '@/hooks/use-user';

export default function DealerJobsClient({ initialJobs = [] }: { initialJobs?: any[] }) {
    const { user, loading: authLoading } = useUser();
    const [jobs, setJobs] = useState<any[]>(initialJobs);
    const [loading, setLoading] = useState(initialJobs.length === 0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function loadJobs() {
            if (!user?.id) return;
            setLoading(true);
            try {
                const res = await listDealerJobsAction(user.id);
                if (mounted) {
                    if (res.success) {
                        setJobs(res.data);
                    } else {
                        setError(res.error || 'Failed to load jobs');
                    }
                }
            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        if (!authLoading) {
            loadJobs();
        }
        return () => { mounted = false; };
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive/50 bg-destructive/5 mx-auto max-w-lg mt-8">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Error Loading Workspace</h3>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </CardContent>
            </Card>
        );
    }

    // Categorize jobs
    const actionRequiredStatuses = ['open', 'in_dispute']; // add more if needed
    const activeStatuses = ['awarded', 'in_progress', 'funded'];
    const completedStatuses = ['completed', 'cancelled'];

    const actionRequiredJobs = jobs.filter(j => actionRequiredStatuses.includes(j.status?.toLowerCase()));
    const activeJobs = jobs.filter(j => activeStatuses.includes(j.status?.toLowerCase()));
    const completedJobs = jobs.filter(j => completedStatuses.includes(j.status?.toLowerCase()));

    const JobCard = ({ job }: { job: any }) => {
        const postedAt = job.postedAt?._seconds 
            ? new Date(job.postedAt._seconds * 1000) 
            : new Date();
            
        const customerName = job.endCustomerContact?.name || 'Customer';
        const customerPhone = job.endCustomerContact?.phone || 'No Phone';
        const pincode = job.address?.cityPincode || '';

        return (
            <Link href={"/dashboard/jobs/" + job.id}>
                <Card className="hover:border-primary/50 transition-colors group cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                    <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {customerName}
                                </h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {pincode} • {customerPhone}
                                </p>
                            </div>
                            <Badge variant={job.status.toLowerCase() === 'completed' ? 'default' : 'outline'} className="uppercase text-[10px]">
                                {job.status.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                        
                        <div className="bg-muted/30 rounded-md p-3 mb-4">
                            <p className="font-medium text-sm truncate">{job.title || job.jobCategory}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Posted {format(postedAt, 'MMM d, yyyy')}
                            </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-muted-foreground">
                                {job.bids?.length || 0} Bids Received
                            </div>
                            <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
                                View Details <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        );
    };

    return (
        <div className="space-y-8 pb-12 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-3xl border">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight">Dealer Workspace</h1>
                    <p className="text-muted-foreground mt-1">Manage your outsourced service network.</p>
                </div>
                <Button asChild size="lg" className="rounded-full shadow-lg">
                    <Link href="/dashboard/dealer-post-job">
                        <Plus className="mr-2 h-5 w-5" />
                        New Service Job
                    </Link>
                </Button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 sm:p-6 text-center">
                        <div className="text-2xl sm:text-4xl font-black text-primary">{actionRequiredJobs.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Action Needed</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 sm:p-6 text-center">
                        <div className="text-2xl sm:text-4xl font-black">{activeJobs.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Active Jobs</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 sm:p-6 text-center">
                        <div className="text-2xl sm:text-4xl font-black">{completedJobs.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Completed</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="action" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 h-auto p-1 bg-muted/50 rounded-full">
                    <TabsTrigger value="action" className="rounded-full py-3 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
                        Needs Action
                        {actionRequiredJobs.length > 0 && (
                            <span className="absolute top-1 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-full py-3 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Active
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-full py-3 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Completed
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="action" className="space-y-4 outline-none">
                    {actionRequiredJobs.length === 0 ? (
                        <div className="text-center py-12 px-4 border rounded-3xl border-dashed bg-muted/10">
                            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">All Caught Up!</h3>
                            <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">You have no jobs that currently require your immediate attention.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {actionRequiredJobs.map(job => <JobCard key={job.id} job={job} />)}
                        </div>
                    )}
                </TabsContent>
                
                <TabsContent value="active" className="space-y-4 outline-none">
                    {activeJobs.length === 0 ? (
                        <div className="text-center py-12 px-4 border rounded-3xl border-dashed bg-muted/10">
                            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">No Active Jobs</h3>
                            <p className="text-muted-foreground mt-2 text-sm">Jobs in progress or awarded will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeJobs.map(job => <JobCard key={job.id} job={job} />)}
                        </div>
                    )}
                </TabsContent>
                
                <TabsContent value="completed" className="space-y-4 outline-none">
                    {completedJobs.length === 0 ? (
                        <div className="text-center py-12 px-4 border rounded-3xl border-dashed bg-muted/10">
                            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">No Completed Jobs</h3>
                            <p className="text-muted-foreground mt-2 text-sm">Your finished service operations will be archived here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {completedJobs.map(job => <JobCard key={job.id} job={job} />)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
