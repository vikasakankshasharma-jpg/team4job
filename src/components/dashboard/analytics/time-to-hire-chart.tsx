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
        return (
            <div data-testid="analytics-chart-time-to-hire" className="col-span-2">
                <MetricChartCard title={t('timeToHire')} description={t('avgDaysToHireDescription')} className="col-span-2">
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground/30 bg-background/20 rounded-[3rem] border border-dashed border-white/5 shadow-inner">
                        <div className="p-4 rounded-[2rem] bg-muted/10 mb-6 animate-pulse shadow-2xl shadow-primary/5 border border-white/5">
                            <LineChart className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">{t('noData')}</p>
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
                                borderRadius: "1rem",
                                border: "1px solid rgba(255,255,255,0.1)",
                                backgroundColor: "rgba(var(--background), 0.8)",
                                backdropFilter: "blur(24px)",
                                color: "hsl(var(--foreground))",
                                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                                padding: "12px 20px"
                            }}
                            itemStyle={{
                                fontWeight: "900",
                                textTransform: "uppercase",
                                fontStyle: "italic",
                                letterSpacing: "0.1em",
                                fontSize: "10px"
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
