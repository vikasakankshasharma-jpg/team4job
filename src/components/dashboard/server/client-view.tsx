
import { Suspense } from "react";
import { User } from "@/lib/types";

import { ClientStatsWidget } from "@/components/dashboard/widgets/client-stats";
import { ClientChartsWidget } from "@/components/dashboard/widgets/client-charts";
import { RecentActivityWidget } from "@/components/dashboard/widgets/recent-activity-widget";
import { ClientHelpSetter } from "@/components/dashboard/client-help-setter";
import { ActionRequiredDashboard } from "@/components/notifications/action-required-dashboard";
import { RecommendedProfessionalsCard } from "@/components/dashboard/recommended-professionals-card";
import { SpendingInsightsCard } from "@/components/dashboard/spending-insights-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { jobService } from "@/domains/jobs/job.service";

export async function clientServerView({ user }: { user: User }) {
    // We can fetch quickMetrics here for the server-side metrics row if suitable
    // Or we leave DashboardMetrics as Client component if it interacts.
    // DashboardMetrics takes 'metrics' prop. 
    const quickMetrics = await jobService.getQuickMetrics(user.id);

    return (
        <>
            <ClientHelpSetter />

            <div className="flex items-center mb-8">
                <h1 className="text-lg font-semibold md:text-2xl">Welcome, {user.name}!</h1>
            </div>

            <div className="mb-6">
                <ActionRequiredDashboard />
            </div>

            <DashboardMetrics userId={user.id} user={JSON.parse(JSON.stringify(user))} metrics={quickMetrics} />

            <Suspense fallback={<DashboardSkeleton />}>
                <ClientStatsWidget userId={user.id} />
            </Suspense>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
                    <ClientChartsWidget userId={user.id} />
                </Suspense>

                <div className="space-y-6">
                    <RecommendedProfessionalsCard userId={user.id} currentUser={JSON.parse(JSON.stringify(user))} />
                    <SpendingInsightsCard userId={user.id} />
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card data-tour="need-Professional-card" className="col-span-1">
                    <CardHeader>
                        <CardTitle>Need an Professional?</CardTitle>
                        <CardDescription>
                            Post a job and get bids from verified technical professionals.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/wizard">
                                <PlusCircle className="mr-2 h-4 w-4" /> Post a New Job
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
                    <RecentActivityWidget userId={user.id} />
                </Suspense>

                <Card data-tour="manage-jobs-card" className="col-span-1">
                    <CardHeader>
                        <CardTitle>Manage Your Jobs</CardTitle>
                        <CardDescription>
                            Review bids, award projects, and manage your active jobs all in one place.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary">
                            <Link href="/dashboard/posted-jobs">
                                Go to My Jobs <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}



