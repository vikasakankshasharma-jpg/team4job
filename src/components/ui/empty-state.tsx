
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50",
                className
            )}
            {...props}
        >
            {Icon && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6 group transition-colors">
                    <Icon className="h-10 w-10 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                </div>
            )}
            <h3 className="mb-2 text-2xl font-semibold tracking-tight">{title}</h3>
            {description && (
                <p className="mb-8 max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {action && (
                <div className="flex items-center gap-2">
                    {action}
                </div>
            )}
        </div>
    );
}
