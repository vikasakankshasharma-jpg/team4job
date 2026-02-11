import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { SignupPriority } from "@/lib/types";
import { ArrowUp, ArrowRight, ArrowDown } from "lucide-react";

interface PriorityBadgeProps {
    priority: SignupPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    const t = useTranslations("admin.pendingSignups.badges.priority");
    const config = {
        high: {
            label: t("high"),
            icon: ArrowUp,
            className: "bg-red-100 text-red-700 border-red-300",
        },
        medium: {
            label: t("medium"),
            icon: ArrowRight,
            className: "bg-yellow-100 text-yellow-700 border-yellow-300",
        },
        low: {
            label: t("low"),
            icon: ArrowDown,
            className: "bg-gray-100 text-gray-700 border-gray-300",
        },
    };

    const { label, icon: Icon, className } = config[priority];

    return (
        <Badge variant="outline" className={className}>
            <Icon className="h-3 w-3 mr-1" />
            {label}
        </Badge>
    );
}
