"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Mail, MessageSquare, FileText, CheckCircle2, Clock } from "lucide-react";
import type { ActivityLogEntry } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface ActivityTimelineDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activities: ActivityLogEntry[];
    userName?: string;
}

const actionIcons = {
    call: Phone,
    sms: MessageSquare,
    email: Mail,
    note: FileText,
    status_change: CheckCircle2,
};

const outcomeColors = {
    answered: "bg-green-100 text-green-700",
    no_answer: "bg-gray-100 text-gray-700",
    busy: "bg-yellow-100 text-yellow-700",
    voicemail: "bg-blue-100 text-blue-700",
    scheduled: "bg-purple-100 text-purple-700",
    denied: "bg-red-100 text-red-700",
};

export function ActivityTimelineDialog({
    open,
    onOpenChange,
    activities,
    userName = "User",
}: ActivityTimelineDialogProps) {
    const t = useTranslations("admin.pendingSignups.dialogs.timeline");
    const sortedActivities = [...activities].sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : a.timestamp.toMillis();
        const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp.toMillis();
        return bTime - aTime; // Most recent first
    });

    const toDate = (timestamp: any) => {
        if (timestamp instanceof Date) return timestamp;
        return timestamp.toDate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description", { name: userName })}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px] pr-4">
                    {sortedActivities.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            {t("empty")}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedActivities.map((activity) => {
                                const Icon = actionIcons[activity.action];

                                return (
                                    <div key={activity.id} className="flex gap-3 border-l-2 border-gray-200 pl-4 pb-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="bg-primary/10 p-2 rounded-full">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium capitalize">
                                                        {activity.action.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t("by", { name: activity.adminName })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(toDate(activity.timestamp), { addSuffix: true })}
                                                </div>
                                            </div>

                                            {activity.outcome && (
                                                <Badge className={outcomeColors[activity.outcome] || ""}>
                                                    {activity.outcome.replace('_', ' ')}
                                                </Badge>
                                            )}

                                            {activity.notes && (
                                                <p className="text-sm bg-gray-50 p-2 rounded border">
                                                    {activity.notes}
                                                </p>
                                            )}

                                            {activity.nextAction && (
                                                <p className="text-sm text-primary">
                                                    → {t("next", { action: activity.nextAction })}
                                                </p>
                                            )}

                                            {activity.followUpScheduled && (
                                                <p className="text-sm text-orange-600">
                                                    📅 {t("followUp", { date: toDate(activity.followUpScheduled).toLocaleString() })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
