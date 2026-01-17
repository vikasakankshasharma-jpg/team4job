"use client";

import React from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
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

const DisputePerformanceCard = dynamic(() => import("@/components/dashboard/cards/dispute-performance-card").then(mod => mod.DisputePerformanceCard), { ssr: false });

export function SupportTeamDashboard() {
    const { user } = useUser();
    const { db } = useFirebase();
    const { setHelp } = useHelp();
    const [stats, setStats] = React.useState({ openDisputes: 0, underReviewDisputes: 0 });
    const [disputes, setDisputes] = React.useState<Dispute[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchData() {
            if (!user || !db) return;
            setLoading(true);

            const disputesRef = collection(db, "disputes");

            const openQuery = query(disputesRef, where('status', '==', 'Open'));
            const reviewQuery = query(disputesRef, where('status', '==', 'Under Review'));

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
            title: 'Support Dashboard Guide',
            content: (
                <div className="space-y-4 text-sm">
                    <p>Welcome to the Support Dashboard. Your primary focus is to manage and resolve user disputes.</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">Open Disputes:</span> These are new cases that require your immediate attention.
                        </li>
                        <li>
                            <span className="font-semibold">Under Review:</span> These are disputes you are actively investigating.
                        </li>
                        <li>
                            <span className="font-semibold">Performance:</span> This card shows your personal dispute resolution metrics, helping you track your progress.
                        </li>
                    </ul>
                    <p>Click on the stat cards to navigate to the Dispute Center and start resolving cases.</p>
                </div>
            )
        });
    }, [setHelp]);

    if (loading) {
        return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    return (
        <>
            <div className="flex items-center mb-8">
                <h1 className="text-lg font-semibold md:text-2xl">Support Dashboard</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                    title="Open Disputes"
                    value={stats.openDisputes}
                    description="New cases requiring attention"
                    icon={AlertOctagon}
                    href="/dashboard/disputes"
                    iconBgColor="bg-red-100 dark:bg-red-900"
                    iconColor="text-red-600 dark:text-red-300"
                />
                <StatCard
                    title="Under Review"
                    value={stats.underReviewDisputes}
                    description="Disputes you are investigating"
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
                        <CardTitle>Dispute Center</CardTitle>
                        <CardDescription>
                            Review, manage, and resolve all user-submitted disputes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/disputes">
                                Go to Disputes <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
