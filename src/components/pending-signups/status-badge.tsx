import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { SignupStatus } from "@/lib/types";

interface StatusBadgeProps {
    status: SignupStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const t = useTranslations("admin.pendingSignups.badges.status");
    const variants: Record<SignupStatus, { label: string; variant: any; className?: string }> = {
        new: {
            label: t("new"),
            variant: "default",
            className: "bg-blue-500 hover:bg-blue-600",
        },
        contacted: {
            label: t("contacted"),
            variant: "secondary",
        },
        follow_up: {
            label: t("follow_up"),
            variant: "outline",
            className: "border-orange-500 text-orange-700",
        },
        busy: {
            label: t("busy"),
            variant: "outline",
            className: "border-yellow-500 text-yellow-700",
        },
        denied: {
            label: t("denied"),
            variant: "destructive",
        },
        converted: {
            label: t("converted"),
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
