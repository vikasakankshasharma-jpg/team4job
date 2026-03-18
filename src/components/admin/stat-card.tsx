import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    description?: string;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    className?: string;
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className,
}: StatCardProps) {
    return (
        <Card className={cn("border-0 shadow-sm shadow-primary/5 hover:shadow-md transition-shadow relative overflow-hidden", className)}>
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
                {Icon && <Icon className="h-4 w-4 text-primary/60" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
                {trend && (
                    <p
                        className={cn(
                            "text-xs mt-1 font-medium",
                            trend.isPositive ? "text-green-600" : "text-red-600"
                        )}
                    >
                        {trend.value}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
