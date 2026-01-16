"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeToHireData } from "@/lib/api/analytics";

interface TimeToHireChartProps {
    data: TimeToHireData[];
}

export function TimeToHireChart({ data }: TimeToHireChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Time to Hire</CardTitle>
                    <CardDescription>Average days to hire over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Time to Hire</CardTitle>
                <CardDescription>
                    Average days from posting to hiring
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
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
            </CardContent>
        </Card>
    );
}
