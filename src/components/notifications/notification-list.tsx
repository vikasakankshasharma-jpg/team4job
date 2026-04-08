import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Bell, Briefcase, Calendar, CheckCircle, AlertCircle, MessageSquare, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

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
        case 'FAVORITE_PROFESSIONAL_BID':
            return <Briefcase className="h-4 w-4 text-pink-500" />;
        default:
            return <Bell className="h-4 w-4 text-gray-500" />;
    }
};

export function NotificationList({ notifications, onMarkAsRead, onItemClick, className, emptyMessage = "No notifications" }: NotificationListProps) {
    if (notifications.length === 0) {
        return (
            <div className={cn("p-12", className)}>
                <EmptyState 
                    icon={Bell} 
                    title={emptyMessage} 
                    description="Intelligence Feed Idle // Standing by for incoming mission data or protocol updates."
                    className="py-16 bg-surface-container-low/20"
                />
            </div>
        );
    }

    return (
        <ScrollArea className={cn("h-[400px]", className)}>
            <div className="flex flex-col gap-2 p-3" role="list">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                            "flex items-start gap-6 p-8 rounded-[2.5rem] transition-all cursor-pointer border border-white/5 outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:translate-x-2 active:scale-[0.98] ring-1 ring-white/5",
                            notification.read
                                ? "bg-background/20 backdrop-blur-md hover:bg-background/40 shadow-inner"
                                : "bg-surface-container-low/60 backdrop-blur-3xl hover:bg-surface-container-high/60 border-l-[12px] border-l-primary shadow-2xl shadow-primary/10",
                            "group"
                        )}
                        onClick={() => {
                            if (!notification.read) onMarkAsRead(notification.id);
                            if (onItemClick) onItemClick(notification);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (!notification.read) onMarkAsRead(notification.id);
                                if (onItemClick) onItemClick(notification);
                            }
                        }}
                    >
                        <div className="mt-1 flex-shrink-0 p-4 rounded-[1.5rem] bg-background/50 border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                            {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className={cn("text-sm font-black italic tracking-[0.3em] uppercase", !notification.read ? "text-primary" : "text-foreground/40")}>
                                    {notification.title}
                                </p>
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/20 whitespace-nowrap ml-4 leading-none italic">
                                    {(() => {
                                        const date = notification.createdAt;
                                        try {
                                            const d = date instanceof Date ? date : (date as any)?.toDate ? (date as any).toDate() : new Date(date as any);
                                            return formatDistanceToNow(d, { addSuffix: true }).toUpperCase();
                                        } catch (e) {
                                            return 'JUST NOW';
                                        }
                                    })()}
                                </span>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-muted-foreground/80 line-clamp-2 overflow-wrap-anywhere">
                                {notification.message}
                            </p>
                            {notification.actionLabel && (
                                <div className="mt-4 text-[10px] font-black italic uppercase tracking-[0.4em] text-primary group-hover:translate-x-2 transition-transform duration-500 flex items-center gap-2">
                                    <span className="h-px w-8 bg-primary/20" />
                                    {notification.actionLabel} {"//"} INITIATE
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
