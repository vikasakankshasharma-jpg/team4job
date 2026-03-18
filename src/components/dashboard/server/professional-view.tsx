
import { Suspense } from "react";
import { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

import { ProfessionalStatsWidget } from "@/components/dashboard/widgets/professional-stats";
import { ProfessionalChartsWidget } from "@/components/dashboard/widgets/professional-charts";
import { RecentActivityWidget } from "@/components/dashboard/widgets/recent-activity-widget";
import { RecommendedJobsList } from "@/domains/jobs";
import { ProfessionalHelpSetter } from "@/components/dashboard/professional-help-setter";
import { getTranslations } from "next-intl/server";

export async function ProfessionalServerView({ user }: { user: User }) {
    const isVerified = user.professionalProfile?.verified;
    const t = await getTranslations('dashboard');

    return (
        <>
            <ProfessionalHelpSetter isVerified={isVerified} />

            <div className="flex items-center mb-8">
                <h1 className="text-xl font-bold tracking-tight">{t('welcomeUser', { name: user.name })}</h1>
            </div>

            {user.roles.some(r => ['Professional', 'Professional'].includes(r)) && !isVerified && (
                <Card className="mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                        <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                            <ShieldCheck className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                        </div>
                        <div>
                            <CardTitle>{t('verifyTitle')}</CardTitle>
                            <CardDescription>{t('verifyDesc')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/verify-Professional">
                                {t('verifyButton')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Suspense fallback={<DashboardSkeleton />}>
                <ProfessionalStatsWidget userId={user.id} />
            </Suspense>

            <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg mt-8" />}>
                <ProfessionalChartsWidget userId={user.id} />
            </Suspense>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                <div className="mt-8 mb-8">
                    <RecommendedJobsList user={user} />
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card data-tour="find-project-card">
                        <CardHeader>
                            <CardTitle>{t('findProjectTitle')}</CardTitle>
                            <CardDescription>{t('findProjectDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/dashboard/jobs">
                                    {t('browseJobs')} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
                        <RecentActivityWidget userId={user.id} />
                    </Suspense>

                    <Card data-tour="manage-profile-card">
                        <CardHeader>
                            <CardTitle>{t('manageProfileTitle')}</CardTitle>
                            <CardDescription>{t('manageProfileDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="secondary">
                                <Link href="/dashboard/profile">
                                    {t('goToProfile')} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
