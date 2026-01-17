"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { MetricChartCard } from "@/components/dashboard/cards/metric-chart-card";
import { SpendingTrendData } from "@/lib/api/analytics";

interface CostTrendsChartProps {
    data: SpendingTrendData[];
}

export function CostTrendsChart({ data }: CostTrendsChartProps) {
    if (!data || data.length === 0) {
        return null; // Or return an empty state managed by wrapper
    }

    return (
        <MetricChartCard title="Spending Trends" description="Monthly project spending over the last 12 months">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis
                        dataKey="month"
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
                        tickFormatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            backgroundColor: "hsl(var(--background))",
                            color: "hsl(var(--foreground))"
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Spent']}
                    />
                    <Bar
                        dataKey="amount"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </MetricChartCard>
    );
}
