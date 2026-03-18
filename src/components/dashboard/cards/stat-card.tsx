"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const StatCard = ({ title, value, description, icon: Icon, href, iconBgColor, iconColor, trend }: { title: string, value: string | number, description?: string, icon: React.ElementType, href: string, iconBgColor: string, iconColor: string, trend?: string }) => (
    <Link href={href} className="block hover-lift h-full group">
        <Card className="flex flex-col h-full relative overflow-hidden min-w-0 border-0 shadow-sm bg-card group-hover:shadow-md transition-all duration-300">
            {/* Accent Bar */}
            <div className={cn("absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity", iconBgColor)} />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
                <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground uppercase mr-2">{title}</CardTitle>
                <div className={cn("p-2 rounded-xl transition-transform duration-300 group-hover:scale-110", iconBgColor)}>
                    <Icon className={cn("h-4 w-4", iconColor)} />
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="text-3xl font-extrabold tracking-tight">{value}</div>
                {description && <p className="text-xs text-muted-foreground mt-1.5 font-medium leading-tight">{description}</p>}
                {trend && (
                    <div className="mt-4 flex items-center text-xs font-bold text-success bg-success/10 w-fit px-2 py-1 rounded-lg">
                        {trend}
                    </div>
                )}
            </CardContent>
        </Card>
    </Link>
);
