"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
    title: string;
    insight: string;
    type: "success" | "warning" | "info" | "neutral";
    icon?: React.ReactNode;
}

export function InsightCard({ title, insight, type, icon }: InsightCardProps) {
    const typeStyles = {
        success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
        warning: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
        info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
        neutral: "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950",
    };

    const iconStyles = {
        success: "text-green-600 dark:text-green-400",
        warning: "text-yellow-600 dark:text-yellow-400",
        info: "text-blue-600 dark:text-blue-400",
        neutral: "text-gray-600 dark:text-gray-400",
    };

    const defaultIcon = type === "success" ? <TrendingUp className="h-5 w-5" /> :
        type === "warning" ? <TrendingDown className="h-5 w-5" /> :
            <Minus className="h-5 w-5" />;

    return (
        <Card className={cn("border-l-4", typeStyles[type])}>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className={cn(iconStyles[type])}>
                        {icon || defaultIcon}
                    </div>
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{insight}</p>
            </CardContent>
        </Card>
    );
}

interface InsightsPanelProps {
    insights: Array<{
        title: string;
        insight: string;
        type: "success" | "warning" | "info" | "neutral";
    }>;
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
    if (insights.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>AI Insights</CardTitle>
                    <CardDescription>No insights available yet. Post more jobs to get personalized recommendations.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
                    <p className="text-sm text-muted-foreground">Actionable recommendations based on your data</p>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {insights.map((insight, index) => (
                    <InsightCard key={index} {...insight} />
                ))}
            </div>
        </div>
    );
}
