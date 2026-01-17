"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricChartCard({ title, description, children, className }: { title: string, description?: string, children: React.ReactNode, className?: string }) {
    return (
        <Card className={cn("flex flex-col", className)}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
                {children}
            </CardContent>
        </Card>
    )
}
