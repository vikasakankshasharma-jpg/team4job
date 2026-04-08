"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Award, Medal } from "lucide-react";
import Link from "next/link";
import { User } from "@/lib/types";
import { format, subMonths } from "date-fns";
import { toDate } from "@/lib/utils";

const tierIcons: Record<string, React.ReactNode> = {
    Bronze: <Medal className="h-4 w-4 text-yellow-700" />,
    Silver: <Medal className="h-4 w-4 text-gray-400" />,
    Gold: <Award className="h-4 w-4 text-amber-500" />,
    Platinum: <Award className="h-4 w-4 text-cyan-400" />,
};

export function TopPerformersCard({ Professionals }: { Professionals: User[] }) {
    const rankedProfessionals = React.useMemo(() => {
        const now = new Date();
        const lastMonthDate = subMonths(now, 1);
        const lastMonthName = format(lastMonthDate, 'MMMM yyyy');

        const twoMonthsAgoDate = subMonths(now, 2);
        const twoMonthsAgoName = format(twoMonthsAgoDate, 'MMMM yyyy');

        return Professionals
            .filter(i => i.professionalProfile)
            .map(Professional => {
                const history = Professional.professionalProfile?.reputationHistory || [];

                const lastMonthEntry = history.find(h => h.month === lastMonthName);
                const twoMonthsAgoEntry = history.find(h => h.month === twoMonthsAgoName);

                const lastMonthPoints = lastMonthEntry?.points || 0;
                const twoMonthsAgoPoints = twoMonthsAgoEntry?.points || 0;
                const monthlyPoints = Math.max(0, lastMonthPoints - twoMonthsAgoPoints);

                return { ...Professional, monthlyPoints };
            })
            .sort((a, b) => {
                if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
                if ((b.professionalProfile?.rating || 0) !== (a.professionalProfile?.rating || 0)) return (b.professionalProfile?.rating || 0) - (a.professionalProfile?.rating || 0);
                return toDate(a.memberSince).getTime() - toDate(b.memberSince).getTime();
            });
    }, [Professionals]);

    const lastMonthName = format(subMonths(new Date(), 1), 'MMMM yyyy');

    return (
        <Card className="border-none bg-surface-container-low/40 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] ring-1 ring-white/10 overflow-hidden h-full">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-black italic tracking-tighter uppercase text-primary">Hall of Valor // Top Performers</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Units with maximum reputation gain during {lastMonthName.toUpperCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                <div className="space-y-2">
                    {rankedProfessionals.slice(0, 5).map((Professional, index) => (
                        <div key={Professional.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-background/50 border border-white/5 hover:bg-background hover:translate-x-1 transition-all group/performer shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-6 text-xl font-black italic tracking-tighter text-primary/40 group-hover/performer:text-primary transition-colors">
                                    {index + 1}
                                </div>
                                <Avatar className="h-12 w-12 border border-white/10 shadow-lg">
                                    <AnimatedAvatar svg={Professional.avatarUrl} />
                                </Avatar>
                                <div className="min-w-0">
                                    <Link href={`/dashboard/users/${Professional.id}`} className="font-black italic tracking-tighter uppercase text-sm hover:text-primary transition-colors truncate block">
                                        {Professional.name}
                                    </Link>
                                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">
                                        {tierIcons[Professional.professionalProfile?.tier || 'Bronze']}
                                        <span>{Professional.professionalProfile?.tier} Class Unit</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right font-black italic tracking-tighter uppercase text-success bg-success/10 px-4 py-1.5 rounded-full border border-success/10 text-xs">
                                +{Professional.monthlyPoints} PTS
                            </div>
                        </div>
                    ))}
                </div>
                {rankedProfessionals.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground/40 font-black uppercase tracking-widest text-[10px] italic">
                        Insufficient mission data to calculate rankings.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
