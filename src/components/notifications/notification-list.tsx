import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Bell, Briefcase, Calendar, CheckCircle, AlertCircle, MessageSquare, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface NotificationListProps {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onItemClick?: (notification: Notification) => void;
    className?: string;
    emptyMessage?: string;
}

const getIcon = (type: Notification['type']) => {
    switch (type) {
        case 'NEW_BID':
        case 'BID_UPDATED':
            return <Briefcase className="h-4 w-4 text-blue-500" />;
        case 'FUNDING_DEADLINE_APPROACHING':
        case 'AWARD_DEADLINE_APPROACHING':
            return <AlertCircle className="h-4 w-4 text-amber-500" />;
        case 'JOB_STARTED':
        case 'WORK_SUBMITTED':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'MESSAGE_RECEIVED':
        case 'REVIEW_REQUESTED':
            return <MessageSquare className="h-4 w-4 text-purple-500" />;
        case 'PAYMENT_RELEASED':
            return <CreditCard className="h-4 w-4 text-emerald-500" />;
        case 'FAVORITE_INSTALLER_BID':
            return <Briefcase className="h-4 w-4 text-pink-500" />;
        default:
            return <Bell className="h-4 w-4 text-gray-500" />;
    }
};

export function NotificationList({ notifications, onMarkAsRead, onItemClick, className, emptyMessage = "No notifications" }: NotificationListProps) {
    if (notifications.length === 0) {
        return (
            <div className={cn("p-8 text-center text-muted-foreground", className)}>
                <Bell className="mx-auto h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <ScrollArea className={cn("h-[400px]", className)}>
            <div className="flex flex-col gap-1 p-1">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={cn(
                            "flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer border border-transparent",
                            notification.read ? "bg-background hover:bg-muted/50" : "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 border-l-blue-500",
                            "group"
                        )}
                        onClick={() => {
                            if (!notification.read) onMarkAsRead(notification.id);
                            if (onItemClick) onItemClick(notification);
                        }}
                    >
                        <div className="mt-1 flex-shrink-0">
                            {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className={cn("text-sm font-medium leading-none", !notification.read && "text-foreground")}>
                                    {notification.title}
                                </p>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {(() => {
                                        const date = notification.createdAt;
                                        try {
                                            const d = date instanceof Date ? date : (date as any)?.toDate ? (date as any).toDate() : new Date(date as any);
                                            return formatDistanceToNow(d, { addSuffix: true });
                                        } catch (e) {
                                            return 'Just now';
                                        }
                                    })()}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {notification.message}
                            </p>
                            {notification.actionLabel && (
                                <Button variant="link" className="p-0 h-auto text-xs mt-1">
                                    {notification.actionLabel}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
