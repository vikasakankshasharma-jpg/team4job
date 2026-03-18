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
        <Card>
            <CardHeader>
                <CardTitle>Top Performers ({lastMonthName})</CardTitle>
                <CardDescription>Professionals with the highest reputation gain last month.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Professional</TableHead>
                            <TableHead className="text-right">Points Gained</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankedProfessionals.slice(0, 3).map((Professional, index) => (
                            <TableRow key={Professional.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-lg w-4">{index + 1}</span>
                                        <Avatar className="h-9 w-9 hidden sm:flex">
                                            <AnimatedAvatar svg={Professional.avatarUrl} />
                                        </Avatar>
                                        <div>
                                            <Link href={`/dashboard/users/${Professional.id}`} className="font-medium hover:underline">{Professional.name}</Link>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {tierIcons[Professional.professionalProfile?.tier || 'Bronze']}
                                                <span>{Professional.professionalProfile?.tier} Tier</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600">+{Professional.monthlyPoints} pts</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {rankedProfessionals.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground">Not enough data to rank performers.</p>
                )}
            </CardContent>
        </Card>
    );
}
