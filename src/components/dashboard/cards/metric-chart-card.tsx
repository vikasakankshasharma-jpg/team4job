"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricChartCard({ title, description, children, className }: { title: string, description?: string, children: React.ReactNode, className?: string }) {
    return (
        <Card className={cn("flex flex-col border-none bg-surface-container-low/40 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_45px_120px_rgba(0,0,0,0.2)] ring-1 ring-white/10 overflow-hidden", className)}>
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-black italic tracking-tighter uppercase text-primary">{title}</CardTitle>
                {description && <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">{description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] p-8 pt-0">
                {children}
            </CardContent>
        </Card>
    )
}
