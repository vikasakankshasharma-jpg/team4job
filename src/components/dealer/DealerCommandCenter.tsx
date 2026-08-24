'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { getDealerDashboardStatsAction } from '@/app/actions/dashboard.actions';
import { Loader2, Star, RotateCcw } from 'lucide-react';
import AttentionQueue from './AttentionQueue';
import QuickActionBar from './QuickActionBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DealerCommandCenter({ initialStats }: { initialStats?: any }) {
    const { user } = useUser();
    const [stats, setStats] = useState<any>(initialStats);
    const [isLoading, setIsLoading] = useState(!initialStats);

    useEffect(() => {
        if (!initialStats && user) {
            getDealerDashboardStatsAction(user.id).then(res => {
                if (res.success) {
                    setStats(res.data);
                }
                setIsLoading(false);
            });
        }
    }, [user, initialStats]);

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!stats) return <div>Failed to load dashboard data</div>;

    const { metrics, queues } = stats;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tight">Dealer Command Center</h1>
                <p className="text-muted-foreground mt-1">What needs your attention right now?</p>
            </div>

            {/* Top Attention Queue */}
            <AttentionQueue queues={queues} metrics={metrics} />

            {/* Quick Actions */}
            <QuickActionBar />

            {/* Detailed Ops Tabs */}
            <Tabs defaultValue="matching" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 rounded-lg p-1">
                    <TabsTrigger value="matching" className="rounded-md">Matching & Review ({metrics.actionRequired})</TabsTrigger>
                    <TabsTrigger value="execution" className="rounded-md">Execution ({metrics.active})</TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-md">Completed & Disputed ({metrics.completed + metrics.disputed})</TabsTrigger>
                </TabsList>

                <TabsContent value="matching">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-4">Jobs Awaiting Action</h3>
                            {queues.pendingAwards.length === 0 && queues.noMatches.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md">
                                    No jobs currently in matching or review phase.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {queues.pendingAwards.map((job: any) => (
                                        <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                                            <div>
                                                <p className="font-medium">{job.title || job.jobCategory}</p>
                                                <p className="text-sm text-muted-foreground">{job.location} • Smart Matches Ready</p>
                                            </div>
                                            <Button asChild size="sm">
                                                <Link href={`/dashboard/dealer-jobs/${job.id}`}>Review & Award</Link>
                                            </Button>
                                        </div>
                                    ))}
                                    {queues.noMatches.map((job: any) => (
                                        <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                                            <div>
                                                <p className="font-medium">{job.title || job.jobCategory}</p>
                                                <p className="text-sm text-muted-foreground">{job.location} • Searching for installers</p>
                                            </div>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/dealer-jobs/${job.id}`}>View Details</Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="execution">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-4">Active Operations & Payments</h3>
                            {queues.pendingPayments && queues.pendingPayments.length > 0 && (
                                <div className="space-y-4 mb-6">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">Pending Payments</h4>
                                    {queues.pendingPayments.map((job: any) => (
                                        <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                                            <div>
                                                <p className="font-medium">{job.title || job.jobCategory}</p>
                                                <p className="text-sm text-muted-foreground">{job.location} • Payment / Release Pending</p>
                                            </div>
                                            <Button asChild size="sm">
                                                <Link href={`/dashboard/dealer-jobs/${job.id}`}>Manage Payment</Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md">
                                View your {metrics.active} active jobs here.
                            </div>
                            <div className="mt-4 text-center">
                                <Button asChild variant="link">
                                    <Link href="/dashboard/dealer-jobs">Go to full jobs list</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="completed">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">Recently Completed</h3>
                                <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                    {metrics.completed} this month
                                </div>
                            </div>
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md">
                                Completed jobs history and disputed jobs ({metrics.disputed}) will appear here.
                            </div>
                            <div className="mt-4 text-center">
                                <Button asChild variant="link">
                                    <Link href="/dashboard/dealer-jobs">View all past jobs</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Bottom Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                {/* Repeat Business Widget */}
                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center">
                            <RotateCcw className="mr-2 h-5 w-5 text-primary" />
                            Repeat Business & Maintenance
                        </h3>
                        {queues.maintenanceDueSites && queues.maintenanceDueSites.length > 0 ? (
                            <div className="space-y-3">
                                {queues.maintenanceDueSites.map((site: any) => (
                                    <div key={site.id} className="flex justify-between items-center p-3 border rounded-md">
                                        <div>
                                            <p className="font-medium">{site.name}</p>
                                            <p className="text-xs text-muted-foreground">Due: {new Date(site.history?.nextDueDate?._seconds ? site.history.nextDueDate._seconds * 1000 : site.history.nextDueDate).toLocaleDateString()}</p>
                                        </div>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/dashboard/dealer-post-job?mode=repeat&siteId=${site.id}`}>Schedule</Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded text-center">
                                No maintenance due or overdue at this time.
                            </div>
                        )}
                        <Button variant="link" className="w-full mt-4" asChild>
                            <Link href="/dashboard/dealer-workspace/customers">View all Service Sites</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Installer Performance Widget */}
                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center">
                            <Star className="mr-2 h-5 w-5 text-primary" />
                            Installer Performance Insights
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 border-b">
                                <div>
                                    <p className="font-medium text-sm">Global Trust (Lifetime Points)</p>
                                    <p className="text-xs text-muted-foreground">Top tier installers you rely on</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-3 border-b">
                                <div>
                                    <p className="font-medium text-sm">Current Cycle Performance</p>
                                    <p className="text-xs text-muted-foreground">Highest recent completion rates</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-3">
                                <div>
                                    <p className="font-medium text-sm">Emerging Installers</p>
                                    <p className="text-xs text-muted-foreground">High potential, low lifetime points</p>
                                </div>
                            </div>
                        </div>
                        <Button variant="link" className="w-full mt-2" disabled>
                            Detailed Analytics (Coming Phase 9)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
