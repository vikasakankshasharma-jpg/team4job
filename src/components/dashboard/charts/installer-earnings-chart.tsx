"use client";

import * as React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricChartCard } from "@/components/dashboard/cards/metric-chart-card";

export function InstallerEarningsChart({ data }: { data: any[] }) {
    return (
        <MetricChartCard title="Earnings Overview" description="Your monthly earnings over last 6 months" className="md:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => `₹${val}`} />
                    <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} labelStyle={{ color: 'black' }} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorEarnings)" name="Earnings" />
                </AreaChart>
            </ResponsiveContainer>
        </MetricChartCard>
    );
}
