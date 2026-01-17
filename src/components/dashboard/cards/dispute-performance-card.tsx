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
        <Card>
            <CardHeader>
                <CardTitle>My Dispute Performance</CardTitle>
                <CardDescription>An overview of your dispute resolution metrics.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <Card className="flex flex-col items-center justify-center p-6">
                    <ChartContainer
                        config={performanceChartConfig}
                        className="mx-auto aspect-square h-full w-full max-w-[250px]"
                    >
                        <RadialBarChart
                            data={chartData}
                            startAngle={90}
                            endAngle={-270}
                            innerRadius="70%"
                            outerRadius="110%"
                        >
                            <PolarGrid gridType="circle" radialLines={false} stroke="none" />
                            <RadialBar dataKey="value" background cornerRadius={10} />
                            <PolarAngleAxis type="number" domain={[0, 100]} dataKey="value" tick={false} />
                        </RadialBarChart>
                    </ChartContainer>
                    <p className="text-5xl font-bold mt-[-2.5rem]">{resolutionRate.toFixed(0)}<span className="text-xl text-muted-foreground">%</span></p>
                    <p className="text-center text-sm text-muted-foreground mt-2">Resolution Rate</p>
                </Card>
                <div className="grid grid-rows-3 gap-4">
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <MessageSquare className="h-6 w-6 mb-2 text-primary" />
                        <p className="text-2xl font-bold">{totalDisputes}</p>
                        <p className="text-sm text-muted-foreground">Total Disputes Handled</p>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <ShieldCheck className="h-6 w-6 mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{resolvedDisputes}</p>
                        <p className="text-sm text-muted-foreground">Disputes Resolved</p>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <Clock className="h-6 w-6 mb-2 text-amber-500" />
                        <p className="text-2xl font-bold">{avgResolutionTimeDays.toFixed(1)} Days</p>
                        <p className="text-sm text-muted-foreground">Avg. Resolution Time</p>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}
