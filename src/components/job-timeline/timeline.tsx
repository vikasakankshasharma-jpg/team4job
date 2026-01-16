"use client";

import { TimelineEvent, getEventColor } from "@/lib/services/timeline-builder";
import { toDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
    CheckCircle,
    DollarSign,
    MessageCircle,
    Wallet,
    Star,
    Bell,
    Circle,
    ArrowRight,
    Award,
    PlayCircle,
    CheckCircle2,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    CheckCircle,
    DollarSign,
    MessageCircle,
    Wallet,
    Star,
    Bell,
    Circle,
    ArrowRight,
    Award,
    PlayCircle,
    CheckCircle2,
    Clock,
};

interface TimelineProps {
    events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Circle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No timeline events yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {events.map((event, idx) => {
                const IconComponent = iconMap[event.icon || 'Circle'] || Circle;
                const color = getEventColor(event);

                const colorClasses = {
                    green: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
                    blue: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                    purple: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
                    yellow: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
                    amber: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                };

                return (
                    <div key={event.id} className="flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "rounded-full p-2",
                                colorClasses[color as keyof typeof colorClasses] || colorClasses.gray
                            )}>
                                <IconComponent className="h-4 w-4" />
                            </div>
                            {idx < events.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border mt-2 min-h-[24px]" />
                            )}
                        </div>

                        {/* Event details */}
                        <div className="flex-1 pb-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">{event.title}</p>
                                    {event.description && (
                                        <p className="text-sm text-muted-foreground   mt-0.5 break-words">{event.description}</p>
                                    )}
                                    {event.actorName && event.actor !== 'system' && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            by {event.actorName}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    {formatDistanceToNow(toDate(event.timestamp), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
