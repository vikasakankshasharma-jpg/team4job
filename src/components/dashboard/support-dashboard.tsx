"use client";

import React from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    AlertOctagon,
    MessageSquare,
    ArrowRight,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import { Dispute } from "@/lib/types";
import { collection, query, where, getDocs } from "firebase/firestore";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/dashboard/cards/stat-card";
import { DISPUTE_STATUS } from "@/lib/constants/statuses";

const DisputePerformanceCard = dynamic(() => import("@/components/dashboard/cards/dispute-performance-card").then(mod => mod.DisputePerformanceCard), { ssr: false });

export function SupportTeamDashboard() {
    const { user } = useUser();
    const { db } = useFirebase();
    const { setHelp } = useHelp();
    const t = useTranslations('supportTeam');
    const [stats, setStats] = React.useState({ openDisputes: 0, underReviewDisputes: 0 });
    const [disputes, setDisputes] = React.useState<Dispute[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchData() {
            if (!user || !db) return;
            setLoading(true);

            const disputesRef = collection(db, "disputes");

            const openQuery = query(disputesRef, where('status', '==', DISPUTE_STATUS.OPEN));
            const reviewQuery = query(disputesRef, where('status', '==', DISPUTE_STATUS.UNDER_REVIEW));

            const [openSnapshot, reviewSnapshot] = await Promise.all([
                getDocs(openQuery),
                getDocs(reviewQuery),
            ]);

            const involvedDisputesQuery = query(disputesRef, where('handledBy', '==', user.id));
            const involvedSnapshot = await getDocs(involvedDisputesQuery);
            const handledDisputes = involvedSnapshot.docs.map(d => d.data() as Dispute);

            setDisputes(handledDisputes);

            setStats({
                openDisputes: openSnapshot.size,
                underReviewDisputes: reviewSnapshot.size,
            });

            setLoading(false);
        }
        fetchData();
    }, [user, db]);

    React.useEffect(() => {
        setHelp({
            title: t('guide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('guide.welcome')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">{t('guide.openDisputes')}</span> {t('guide.openDisputesDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.underReview')}</span> {t('guide.underReviewDesc')}
                        </li>
                        <li>
                            <span className="font-semibold">{t('guide.performance')}</span> {t('guide.performanceDesc')}
                        </li>
                    </ul>
                    <p>{t('guide.bottomText')}</p>
                </div>
            )
        });
    }, [setHelp, t]);

    if (loading) {
        return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    return (
        <>
            <div className="flex items-center mb-8">
                <h1 className="text-lg font-semibold md:text-2xl">{t('welcome')}</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                    title={t('openDisputes')}
                    value={stats.openDisputes}
                    description={t('openDisputesDesc')}
                    icon={AlertOctagon}
                    href="/dashboard/disputes"
                    iconBgColor="bg-red-100 dark:bg-red-900"
                    iconColor="text-red-600 dark:text-red-300"
                />
                <StatCard
                    title={t('underReview')}
                    value={stats.underReviewDisputes}
                    description={t('underReviewDesc')}
                    icon={MessageSquare}
                    href="/dashboard/disputes?status=Under+Review"
                    iconBgColor="bg-yellow-100 dark:bg-yellow-900"
                    iconColor="text-yellow-600 dark:text-yellow-300"
                />
            </div>
            <div className="mt-8 grid gap-8">
                {disputes.length > 0 && <DisputePerformanceCard disputes={disputes} />}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('disputeCenter')}</CardTitle>
                        <CardDescription>
                            {t('disputeCenterDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/disputes">
                                {t('goToDisputes')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
