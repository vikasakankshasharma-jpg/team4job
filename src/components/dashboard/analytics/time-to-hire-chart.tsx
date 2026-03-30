"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { MetricChartCard } from "@/components/dashboard/cards/metric-chart-card";
import { TimeToHireData } from "@/lib/api/analytics";
import { useTranslations } from "next-intl";

interface TimeToHireChartProps {
    data: TimeToHireData[];
}

export function TimeToHireChart({ data }: TimeToHireChartProps) {
    const t = useTranslations('analytics');

    if (!data || data.length === 0) {
        // Return wrapper with empty state or let parent handle it. 
        // For consistency, we return the card with "No data" message.
        return (
            <div data-testid="analytics-chart-time-to-hire" className="col-span-2">
                <MetricChartCard title={t('timeToHire')} description={t('avgDaysToHireDescription')} className="col-span-2">
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        {t('noData')}
                    </div>
                </MetricChartCard>
            </div>
        );
    }

    return (
        <div data-testid="analytics-chart-time-to-hire" className="col-span-2">
            <MetricChartCard title={t('timeToHire')} description={t('avgDaysPostingToHiringDescription')} className="col-span-2">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis
                            dataKey="date"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}d`}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: "8px",
                                border: "1px solid hsl(var(--border))",
                                backgroundColor: "hsl(var(--background))",
                                color: "hsl(var(--foreground))"
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="days"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </MetricChartCard>
        </div>
    );
}
