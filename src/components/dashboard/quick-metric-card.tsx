"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon, LucideIcon } from "lucide-react";

interface QuickMetricCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendPositive?: boolean;
    tooltip?: string;
    actionable?: boolean;
    onClick?: () => void;
    className?: string;
}

export function QuickMetricCard({
    label,
    value,
    icon: Icon,
    trend,
    trendPositive,
    tooltip,
    actionable = false,
    onClick,
    className,
}: QuickMetricCardProps) {
    const CardWrapper = actionable || onClick ? "button" : "div";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Card
                        className={cn(
                            "transition-all",
                            (actionable || onClick) && "cursor-pointer hover:shadow-md hover:border-primary/50",
                            className
                        )}
                    >
                        <CardWrapper
                            className="w-full text-left"
                            onClick={onClick}
                            {...(onClick && { type: "button" })}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                            {label}
                                        </p>
                                        <p className="text-2xl font-bold tracking-tight">
                                            {value}
                                        </p>
                                        {trend && (
                                            <div
                                                className={cn(
                                                    "flex items-center gap-1 mt-2 text-xs font-medium",
                                                    trendPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                )}
                                            >
                                                {trendPositive ? (
                                                    <ArrowUpIcon className="h-3 w-3" />
                                                ) : (
                                                    <ArrowDownIcon className="h-3 w-3" />
                                                )}
                                                <span>{trend}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "rounded-full p-2.5",
                                            "bg-primary/10 text-primary"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </CardWrapper>
                    </Card>
                </TooltipTrigger>
                {tooltip && (
                    <TooltipContent>
                        <p className="text-sm max-w-xs">{tooltip}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}
