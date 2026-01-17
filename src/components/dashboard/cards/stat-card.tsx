"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const StatCard = ({ title, value, description, icon: Icon, href, iconBgColor, iconColor, trend }: { title: string, value: string | number, description?: string, icon: React.ElementType, href: string, iconBgColor: string, iconColor: string, trend?: string }) => (
    <Link href={href} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg h-full">
        <Card className="flex flex-col h-full relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className={cn("p-2 rounded-full", iconBgColor)}>
                    <Icon className={cn("h-4 w-4", iconColor)} />
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
                {trend && (
                    <div className="absolute bottom-4 right-4 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        {trend}
                    </div>
                )}
            </CardContent>
        </Card>
    </Link>
);
