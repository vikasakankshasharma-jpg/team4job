"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useFirestore } from "@/lib/firebase/client-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Users, Target } from "lucide-react";
import {
    getSignupAnalytics,
    SignupFunnelData,
    OutreachEffectiveness,
} from "@/lib/signup-analytics";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SignupAnalyticsClient() {
    const { isAdmin } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [funnelData, setFunnelData] = useState<SignupFunnelData | null>(null);
    const [outreachData, setOutreachData] = useState<OutreachEffectiveness | null>(null);
    const [roleDistribution, setRoleDistribution] = useState<{ Installer: number; 'Job Giver': number; unknown: number } | null>(null);

    useEffect(() => {
        if (!db || !isAdmin) return;

        async function fetchAnalytics() {
            setLoading(true);
            try {
                // Optimized: Single read operation (Costs 1x instead of 3x)
                const { funnel, outreach, roles } = await getSignupAnalytics(db);

                setFunnelData(funnel);
                setOutreachData(outreach);
                setRoleDistribution(roles);
            } catch (error) {
                console.error("Error fetching analytics:", error);
                toast({
                    title: "Error",
                    description: "Failed to load analytics data",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [db, isAdmin, toast]);

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Access denied. Admin only.</p>
            </div>
        );
    }

    if (loading || !funnelData || !outreachData || !roleDistribution) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Prepare funnel chart data
    const funnelChartData = [
        { name: 'Started', value: funnelData.totalStarted, fill: COLORS[0] },
        { name: 'Step 1', value: funnelData.step1Complete, fill: COLORS[1] },
        { name: 'Step 2', value: funnelData.step2Complete, fill: COLORS[2] },
        { name: 'Step 3', value: funnelData.step3Complete, fill: COLORS[3] },
        { name: 'Converted', value: funnelData.totalConverted, fill: COLORS[4] },
    ];

    // Prepare outreach comparison data
    const outreachChartData = [
        {
            name: 'Contacted',
            'Conversion Rate': outreachData.contacted.conversionRate,
            Total: outreachData.contacted.total,
        },
        {
            name: 'Not Contacted',
            'Conversion Rate': outreachData.nonContacted.conversionRate,
            Total: outreachData.nonContacted.total,
        },
    ];

    // Prepare role distribution data
    const roleChartData = [
        { name: 'Installers', value: roleDistribution.Installer },
        { name: 'Job Givers', value: roleDistribution['Job Giver'] },
        { name: 'Unknown', value: roleDistribution.unknown },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Signup Analytics</h1>
                <p className="text-muted-foreground">Conversion funnel and outreach effectiveness metrics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Started</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{funnelData.totalStarted}</div>
                        <p className="text-xs text-muted-foreground mt-1">Signup attempts</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{funnelData.conversionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {funnelData.totalConverted} converted
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Biggest Drop-Off</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            Step {Object.entries(funnelData.dropRates).reduce((a, b) => a[1] > b[1] ? a : b)[0].replace('step', '')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {Math.max(...Object.values(funnelData.dropRates)).toFixed(1)}% drop rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outreach Impact</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {outreachData.improvement >= 0 ? '+' : ''}{outreachData.improvement.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {outreachData.improvement >= 0 ? 'Improvement' : 'Decrease'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Funnel Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle>Signup Funnel</CardTitle>
                    <CardDescription>User drop-off at each step of the signup process</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={funnelChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#8884d8">
                                {funnelChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Drop rates */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <p className="text-sm font-medium">Step 1</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step1.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">drop rate</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Step 2</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step2.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">drop rate</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Step 3</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step3.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">drop rate</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Step 4</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step4.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">drop rate</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Outreach Effectiveness */}
            <Card>
                <CardHeader>
                    <CardTitle>Outreach Effectiveness</CardTitle>
                    <CardDescription>Conversion rate comparison: contacted vs non-contacted users</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={outreachChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Conversion Rate" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                            <h4 className="font-semibold mb-2">Contacted Users</h4>
                            <p className="text-sm text-muted-foreground">Total: {outreachData.contacted.total}</p>
                            <p className="text-sm text-muted-foreground">Converted: {outreachData.contacted.converted}</p>
                            <p className="text-2xl font-bold mt-2">{outreachData.contacted.conversionRate.toFixed(1)}%</p>
                        </div>
                        <div className="border rounded-lg p-4">
                            <h4 className="font-semibold mb-2">Non-Contacted Users</h4>
                            <p className="text-sm text-muted-foreground">Total: {outreachData.nonContacted.total}</p>
                            <p className="text-sm text-muted-foreground">Converted: {outreachData.nonContacted.converted}</p>
                            <p className="text-2xl font-bold mt-2">{outreachData.nonContacted.conversionRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Role Distribution</CardTitle>
                    <CardDescription>Breakdown of pending signups by role</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center border rounded-lg p-4">
                            <p className="text-sm font-medium">Installers</p>
                            <p className="text-3xl font-bold mt-2">{roleDistribution.Installer}</p>
                        </div>
                        <div className="text-center border rounded-lg p-4">
                            <p className="text-sm font-medium">Job Givers</p>
                            <p className="text-3xl font-bold mt-2">{roleDistribution['Job Giver']}</p>
                        </div>
                        <div className="text-center border rounded-lg p-4">
                            <p className="text-sm font-medium">Unknown</p>
                            <p className="text-3xl font-bold mt-2">{roleDistribution.unknown}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
