"use client";

import React, { useMemo, useEffect } from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ArrowRight,
    ShieldCheck,
    Briefcase,
    Target,
    UserCheck,
    IndianRupee,
    Clock
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import { toDate } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/dashboard/cards/stat-card";
import { RecommendedJobs } from "@/components/dashboard/recommended-jobs";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { InstallerStats } from "@/domains/jobs/job.types";
import { Transaction } from "@/lib/types";

const InstallerEarningsChart = dynamic(() => import("@/components/dashboard/charts/installer-earnings-chart").then(mod => mod.InstallerEarningsChart), { ssr: false });

export function InstallerDashboard({ stats, transactions, loading = false }: {
    stats: InstallerStats,
    transactions: Transaction[],
    loading?: boolean
}) {
    const { user } = useUser();
    const { setHelp } = useHelp();

    const isVerified = user?.installerProfile?.verified;

    // Process Data for Earnings Chart (Last 6 Months - Released Only)
    const earningsData = useMemo(() => {
        const months = Array.from({ length: 6 }).map((_, i) => {
            const d = subMonths(new Date(), i);
            return {
                name: format(d, 'MMM'),
                fullName: format(d, 'MMM yyyy'),
                amount: 0,
                date: d
            };
        }).reverse();

        transactions.forEach(t => {
            if (t.status === 'released' && t.releasedAt) {
                const date = toDate(t.releasedAt);
                const monthStr = format(date, 'MMM yyyy');
                const monthData = months.find(m => m.fullName === monthStr);
                if (monthData) {
                    monthData.amount += t.payoutToInstaller || 0;
                }
            }
        });
        return months;
    }, [transactions]);

    const totalEarnings = transactions
        .filter(t => t.status === 'released')
        .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);

    const pendingPayments = transactions
        .filter(t => t.status === 'funded')
        .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);


    useEffect(() => {
        setHelp({
            title: 'Installer Dashboard Guide',
            content: (
                <div className="space-y-4 text-sm">
                    <p>Welcome to your Dashboard! This is your central hub for managing your work on the platform.</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">Open Jobs:</span> This shows the total number of jobs currently available for bidding. Click it to find your next opportunity.
                        </li>
                        <li>
                            <span className="font-semibold">My Bids:</span> Tracks all the jobs you&apos;ve bid on and their current status (Bidded, Awarded, etc.). Click to see your bidding history.
                        </li>
                        <li>
                            <span className="font-semibold">Jobs Won:</span> Displays the number of jobs you&apos;ve won that are currently active or in progress.
                        </li>
                        <li>
                            <span className="font-semibold">Projected Earnings:</span> The total value of jobs currently in the &quot;Funded&quot; (Locked) state that you are working on.
                        </li>
                        {!isVerified && (
                            <li>
                                <span className="font-semibold">Verification:</span> Complete your Aadhar verification to become a trusted installer and increase your chances of winning jobs.
                            </li>
                        )}
                        <li>
                            <span className="font-semibold">Find Your Next Project:</span> A quick link to jump directly to the job browsing page.
                        </li>
                    </ul>
                    <p>Use the navigation on the left to access other sections like your Profile, where you can track your reputation and skills.</p>
                </div>
            )
        });
    }, [setHelp, isVerified]);

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <>
            <div className="flex items-center mb-8">
                <h1 className="text-lg font-semibold md:text-2xl">Welcome, {user?.name}!</h1>
            </div>
            {user?.roles.includes('Installer') && !isVerified && (
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Open Jobs"
                    value={stats.openJobs}
                    description="Jobs currently accepting bids"
                    icon={Briefcase}
                    href="/dashboard/jobs"
                    iconBgColor="bg-blue-100 dark:bg-blue-900"
                    iconColor="text-blue-600 dark:text-blue-300"
                />
                <StatCard
                    title="My Bids"
                    value={stats.myBids}
                    description="Your bids and awarded jobs"
                    icon={Target}
                    href="/dashboard/my-bids"
                    iconBgColor="bg-purple-100 dark:bg-purple-900"
                    iconColor="text-purple-600 dark:text-purple-300"
                />
                <StatCard
                    title="Jobs Won"
                    value={stats.jobsWon}
                    description="Total jobs awarded to you"
                    icon={UserCheck}
                    href="/dashboard/my-bids?status=Awarded"
                    iconBgColor="bg-green-100 dark:bg-green-900"
                    iconColor="text-green-600 dark:text-green-300"
                />
            </div>

            {/* Earnings Chart Section */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
                <InstallerEarningsChart data={earningsData} />

                <div className="flex flex-col gap-4">
                    <Card className="flex flex-col justify-center items-center text-center p-6 bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900 flex-1">
                        <div className="p-4 rounded-full bg-green-200 dark:bg-green-900 mb-4">
                            <IndianRupee className="h-8 w-8 text-green-700 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Earnings</p>
                        <h3 className="text-4xl font-bold mt-2 text-green-800 dark:text-green-300">₹{totalEarnings.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-2">Lifetime payout processed</p>
                    </Card>

                    <Card className="flex flex-col justify-center items-center text-center p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 flex-1">
                        <div className="p-4 rounded-full bg-blue-200 dark:bg-blue-900 mb-4">
                            <Clock className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                        </div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Projected Earnings</p>
                        <h3 className="text-4xl font-bold mt-2 text-blue-800 dark:text-blue-300">₹{pendingPayments.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-2">Funds currently Locked</p>
                    </Card>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                <div className="mt-8 mb-8">
                    <RecommendedJobs user={user!} />
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

                    <RecentActivity />

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
