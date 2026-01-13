import { Badge } from "@/components/ui/badge";
import type { SignupStatus } from "@/lib/types";

interface StatusBadgeProps {
    status: SignupStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const variants: Record<SignupStatus, { label: string; variant: any; className?: string }> = {
        new: {
            label: "New Lead",
            variant: "default",
            className: "bg-blue-500 hover:bg-blue-600",
        },
        contacted: {
            label: "Contacted",
            variant: "secondary",
        },
        follow_up: {
            label: "Follow-Up Scheduled",
            variant: "outline",
            className: "border-orange-500 text-orange-700",
        },
        busy: {
            label: "Busy - Reschedule",
            variant: "outline",
            className: "border-yellow-500 text-yellow-700",
        },
        denied: {
            label: "Denied",
            variant: "destructive",
        },
        converted: {
            label: "Converted",
            variant: "default",
            className: "bg-green-500 hover:bg-green-600",
        },
    };

    const config = variants[status];

    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}
