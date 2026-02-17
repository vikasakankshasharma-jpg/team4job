"use client";

import { useEffect, useState } from "react";
import { aiMetricsService } from "@/ai/services/AIMetricsService";
import { AIMetric, AILog } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DollarSign, Clock, AlertTriangle } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";

export default function AIHealthPage() {
    const [metrics, setMetrics] = useState<AIMetric[]>([]);
    const [recentLogs, setRecentLogs] = useState<AILog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [fetchedMetrics, fetchedLogs] = await Promise.all([
                    aiMetricsService.getAggregatedMetrics(7),
                    aiMetricsService.getRecentLogs(20)
                ]);
                setMetrics(fetchedMetrics);
                setRecentLogs(fetchedLogs);
            } catch (error) {
                console.error("Failed to load AI data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Calculate totals directly from the fetched metrics
    const totalCost = metrics.reduce((acc, m) => acc + m.totalCostUsd, 0);
    const totalRequests = metrics.reduce((acc, m) => acc + m.totalRequests, 0);
    const avgLatency = totalRequests > 0
        ? metrics.reduce((acc, m) => acc + (m.averageLatencyMs * m.totalRequests), 0) / totalRequests
        : 0;
    const errorRate = totalRequests > 0
        ? (metrics.reduce((acc, m) => acc + m.errorCount, 0) / totalRequests) * 100
        : 0;

    if (loading) {
        return <div className="flex h-full items-center justify-center">Loading AI Health...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">AI System Health (Last 7 Days)</h1>

            {/* Quick Stats Row */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground">Est. Gemini API Cost</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Requests</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRequests}</div>
                        <p className="text-xs text-muted-foreground">Total AI Invocations</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(avgLatency)}ms</div>
                        <p className="text-xs text-muted-foreground">Response Time</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${errorRate > 1 ? 'text-red-500' : 'text-slate-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{errorRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Failures / Total</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Cost & Request Volume</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis yAxisId="left" fontSize={12} />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                                <Tooltip />
                                <Bar yAxisId="left" dataKey="totalRequests" fill="#3b82f6" name="Requests" />
                                <Bar yAxisId="right" dataKey="totalCostUsd" fill="#22c55e" name="Cost ($)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Latency Trend (ms)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Line type="monotone" dataKey="averageLatencyMs" stroke="#f59e0b" name="Avg Latency" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Live AI Feed (Last 20)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900">
                                <tr className="text-left">
                                    <th className="p-3 font-medium">Time</th>
                                    <th className="p-3 font-medium">Flow</th>
                                    <th className="p-3 font-medium">Model</th>
                                    <th className="p-3 font-medium">Latency</th>
                                    <th className="p-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-muted-foreground">No logs found yet.</td>
                                    </tr>
                                ) : (
                                    recentLogs.map((log) => (
                                        <tr key={log.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="p-3">
                                                {log.timestamp instanceof Object && 'seconds' in log.timestamp
                                                    ? new Date((log.timestamp as any).seconds * 1000).toLocaleTimeString()
                                                    : new Date(log.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="p-3 font-medium">{log.flowName}</td>
                                            <td className="p-3 text-muted-foreground">{log.modelVersion}</td>
                                            <td className="p-3">{log.latencyMs}ms</td>
                                            <td className="p-3">
                                                {log.success ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Success</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Error</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
