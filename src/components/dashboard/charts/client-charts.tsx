"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { MetricChartCard } from "@/components/dashboard/cards/metric-chart-card";

export function SpendingHistoryChart({ data, totalSpent }: { data: any[], totalSpent: number }) {
    return (
        <MetricChartCard title="Spending History" description={`Total Spent: ₹${totalSpent.toLocaleString()} (Released)`}>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => `₹${val}`} />
                    <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} labelStyle={{ color: 'black' }} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
            </ResponsiveContainer>
        </MetricChartCard>
    );
}

export function JobStatusChart({ data }: { data: any[] }) {
    return (
        <MetricChartCard title="Job Status Distribution" description="Distribution of your posted jobs">
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </MetricChartCard>
    );
}
