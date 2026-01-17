"use client";

import * as React from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { MetricChartCard } from "@/components/dashboard/cards/metric-chart-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function AdminRevenueChart({ data, totalRevenue }: { data: any[], totalRevenue: number }) {
    return (
        <MetricChartCard title="Platform Net Revenue" description="Commissions + Fees (Last 6 Months)" className="lg:col-span-2">
            <div className="flex flex-col h-full">
                <div className="mb-4">
                    <span className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground ml-2">Total Net Revenue (Period)</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(val) => `₹${val}`} />
                        <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} labelStyle={{ color: 'black' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" name="Net Revenue" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </MetricChartCard>
    );
}

export function AdminSystemHealthChart({ data }: { data: any[] }) {
    return (
        <MetricChartCard title="System Health" description="All Jobs Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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

export function AdminUserGrowthChart({ data }: { data: any[] }) {
    return (
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New users in the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Installers" stackId="a" fill="hsl(var(--primary))" />
                        <Bar dataKey="Job Givers" stackId="a" fill="hsl(var(--secondary))" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
