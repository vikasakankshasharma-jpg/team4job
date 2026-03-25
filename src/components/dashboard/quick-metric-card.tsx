import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

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
    const CardWrapper = actionable || onClick ? motion.button : motion.div;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <CardWrapper
                        whileHover={actionable || onClick ? { y: -4, scale: 1.02 } : {}}
                        whileTap={actionable || onClick ? { scale: 0.98 } : {}}
                        onClick={onClick}
                        className={cn(
                            "group relative overflow-hidden transition-all duration-500",
                            "border-none bg-card/40 backdrop-blur-xl shadow-xl rounded-[2rem]",
                            (actionable || onClick) && "cursor-pointer hover:shadow-2xl hover:bg-card/60",
                            className
                        )}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70 mb-2">
                                        {label}
                                    </p>
                                    <div className="text-3xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                                        {value}
                                    </div>
                                    {trend && (
                                        <div
                                            className={cn(
                                                "flex items-center gap-1 mt-3 text-[10px] font-black uppercase tracking-tighter w-fit px-2 py-0.5 rounded-full border",
                                                trendPositive 
                                                    ? "text-green-600 bg-green-500/10 border-green-500/20" 
                                                    : "text-red-600 bg-red-500/10 border-red-500/20"
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
                                        "rounded-2xl p-3 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-lg",
                                        "bg-primary/10 text-primary shadow-primary/5"
                                    )}
                                >
                                    <Icon className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </CardWrapper>
                </TooltipTrigger>
                {tooltip && (
                    <TooltipContent side="top" className="font-bold border-none bg-foreground text-background rounded-xl px-4 py-2">
                        <p className="text-xs max-w-xs">{tooltip}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}
