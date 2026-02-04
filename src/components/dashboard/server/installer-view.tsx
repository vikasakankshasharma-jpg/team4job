
import { Suspense } from "react";
import { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

import { InstallerStatsWidget } from "@/components/dashboard/widgets/installer-stats";
import { InstallerChartsWidget } from "@/components/dashboard/widgets/installer-charts";
import { RecentActivityWidget } from "@/components/dashboard/widgets/recent-activity-widget";
import { RecommendedJobs } from "@/components/dashboard/recommended-jobs";
import { InstallerHelpSetter } from "@/components/dashboard/installer-help-setter";

export async function InstallerServerView({ user }: { user: User }) {
    const isVerified = user.installerProfile?.verified;

    return (
        <>
            <InstallerHelpSetter isVerified={isVerified} />

            <div className="flex items-center mb-8">
                <h1 className="text-lg font-semibold md:text-2xl">Welcome, {user.name}!</h1>
            </div>

            {user.roles.includes('Installer') && !isVerified && (
                <Card className="mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                        <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                            <ShieldCheck className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                        </div>
                        <div>
                            <CardTitle>Become a Verified Installer</CardTitle>
                            <CardDescription>Complete Aadhar verification to build trust and get more jobs.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/verify-installer">
                                Verify Now <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Suspense fallback={<DashboardSkeleton />}>
                <InstallerStatsWidget userId={user.id} />
            </Suspense>

            <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg mt-8" />}>
                <InstallerChartsWidget userId={user.id} />
            </Suspense>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                <div className="mt-8 mb-8">
                    {/* RecommendedJobs is Client Component but doesn't fetch on mount automatically, so fine to include */}
                    <RecommendedJobs user={user} />
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card data-tour="find-project-card">
                        <CardHeader>
                            <CardTitle>Find Your Next Project</CardTitle>
                            <CardDescription>
                                Browse hundreds of CCTV installation jobs and place your bid.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/dashboard/jobs">
                                    Browse Jobs <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
                        <RecentActivityWidget userId={user.id} />
                    </Suspense>

                    <Card data-tour="manage-profile-card">
                        <CardHeader>
                            <CardTitle>Manage Your Profile</CardTitle>
                            <CardDescription>
                                Keep your skills and reputation up-to-date to attract more Job Givers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="secondary">
                                <Link href="/dashboard/profile">
                                    Go to Profile <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
