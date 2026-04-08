"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { RadialBarChart, RadialBar, PolarGrid, PolarAngleAxis } from "recharts";
import { MessageSquare, ShieldCheck, Clock } from "lucide-react";
import { differenceInMilliseconds } from "date-fns";
import { toDate } from "@/lib/utils";
import type { Dispute } from "@/lib/types";

export function DisputePerformanceCard({ disputes }: { disputes: Dispute[] }) {
    const totalDisputes = disputes.length;
    const resolvedDisputes = disputes.filter(d => d.status === 'Resolved').length;
    const resolutionRate = totalDisputes > 0 ? (resolvedDisputes / totalDisputes) * 100 : 0;

    const totalResolutionTime = disputes
        .filter(d => d.status === 'Resolved' && d.createdAt && d.resolvedAt)
        .reduce((acc, d) => {
            const timeDiff = differenceInMilliseconds(toDate(d.resolvedAt!), toDate(d.createdAt));
            return acc + timeDiff;
        }, 0);

    const avgResolutionTimeMs = resolvedDisputes > 0 ? totalResolutionTime / resolvedDisputes : 0;
    const avgResolutionTimeDays = avgResolutionTimeMs / (1000 * 60 * 60 * 24);

    const chartData = [{ name: 'Resolved', value: resolutionRate, fill: 'hsl(var(--primary))' }];
    const performanceChartConfig = {
        value: { label: 'Disputes' },
    } satisfies ChartConfig;

    return (
        <Card className="border-none bg-surface-container-low/40 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_45px_120px_rgba(0,0,0,0.2)] ring-1 ring-white/10 overflow-hidden">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Integrity // Dispute Performance
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">An overview of platform trust metrics and resolution efficiency.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 p-8 pt-0">
                <div className="flex flex-col items-center justify-center p-8 rounded-[3rem] bg-background/50 border border-white/5 shadow-inner relative overflow-hidden group/chart">
                    <ChartContainer
                        config={performanceChartConfig}
                        className="mx-auto aspect-square h-full w-full max-w-[250px] transition-transform duration-500 group-hover/chart:scale-105"
                    >
                        <RadialBarChart
                            data={chartData}
                            startAngle={90}
                            endAngle={-270}
                            innerRadius="70%"
                            outerRadius="110%"
                        >
                            <PolarGrid gridType="circle" radialLines={false} stroke="none" />
                            <RadialBar dataKey="value" background cornerRadius={20} />
                            <PolarAngleAxis type="number" domain={[0, 100]} dataKey="value" tick={false} />
                        </RadialBarChart>
                    </ChartContainer>
                    <p className="text-6xl font-black italic tracking-tighter mt-[-2.5rem] group-hover/chart:text-primary transition-colors">{resolutionRate.toFixed(0)}<span className="text-xl text-muted-foreground/50 not-italic tracking-normal">%</span></p>
                    <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-3">Resolution Efficiency</p>
                </div>
                <div className="grid grid-rows-3 gap-4">
                    <div className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-background/50 border border-white/5 shadow-inner hover:bg-background transition-all hover:translate-x-1 group/stat">
                        <MessageSquare className="h-6 w-6 mb-3 text-primary group-hover/stat:scale-110 transition-transform" />
                        <p className="text-3xl font-black italic tracking-tighter uppercase">{totalDisputes}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">Total Payload Handled</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-success/5 border border-success/10 shadow-inner hover:bg-success/10 transition-all hover:translate-x-1 group/stat">
                        <ShieldCheck className="h-6 w-6 mb-3 text-success group-hover/stat:scale-110 transition-transform" />
                        <p className="text-3xl font-black italic tracking-tighter uppercase text-success">{resolvedDisputes}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-success/60 mt-1">Status: Fully Resolved</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 shadow-inner hover:bg-amber-500/10 transition-all hover:translate-x-1 group/stat">
                        <Clock className="h-6 w-6 mb-3 text-amber-600 group-hover/stat:scale-110 transition-transform" />
                        <p className="text-3xl font-black italic tracking-tighter uppercase text-amber-600">{avgResolutionTimeDays.toFixed(1)} <span className="text-xs">DAYS</span></p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 mt-1">Avg. Resolution Latency</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
