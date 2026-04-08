"use client";

import React from "react";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
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
import { Badge } from "@/components/ui/badge";

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

            try {
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
            } catch (error) {
                console.error("[SupportTeamDashboard] Failed to fetch disputes:", error);
            } finally {
                setLoading(false);
            }
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
            <header className="space-y-4 mb-12">
                <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.5em] bg-primary/10 backdrop-blur-3xl italic">
                    SUPPORT // ACTIVE COMMAND HUB
                </Badge>
                <h1 className="text-6xl sm:text-7xl md:text-8xl font-black italic tracking-tighter uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-[0.85]">{t('welcome')}</h1>
            </header>
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
            <div className="mt-12 grid gap-10">
                {disputes.length > 0 && <DisputePerformanceCard disputes={disputes} />}
                <Card className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] ring-1 ring-white/5 group">
                    <CardHeader className="p-12 pb-6">
                        <CardTitle className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-3">{t('disputeCenter')}</CardTitle>
                        <CardDescription className="text-lg font-medium opacity-60 leading-relaxed italic">
                            {t('disputeCenterDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-12 pb-12">
                        <Button asChild className="h-16 px-12 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all italic">
                            <Link href="/dashboard/disputes">
                                {t('goToDisputes')} <ArrowRight className="ml-4 h-6 w-6 transition-transform group-hover:translate-x-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
