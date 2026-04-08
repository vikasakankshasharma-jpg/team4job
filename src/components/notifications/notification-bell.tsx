import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications'; // Assuming hook path
import { NotificationList } from './notification-list';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
    const notifyCtx = useNotifications();
    const notifications = notifyCtx?.notifications || [];
    const unreadCount = notifyCtx?.unreadCount || 0;
    const markAsRead = notifyCtx?.markAsRead || (async () => {});
    const markAllAsRead = notifyCtx?.markAllAsRead || (async () => {});
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleCreateTestNotification = () => {
        // For demo purposes only - hidden feature
        // NotificationsService.createNotification({ ... })
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-[1rem] bg-surface-container-low/40 backdrop-blur-xl border border-white/5 shadow-inner hover:bg-surface-container-high transition-all group">
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[10px] font-black italic items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </div>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[24rem] p-0 shadow-[0_45px_120px_rgba(0,0,0,0.3)] border-none ring-1 ring-white/10 bg-surface-container-low/60 backdrop-blur-3xl rounded-[3rem] overflow-hidden mt-4" align="end">
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-background/40">
                    <h4 className="text-sm font-black italic tracking-tighter uppercase text-on-surface">Mission Intel // <span className="text-primary">{unreadCount > 0 ? `Unread (${unreadCount})` : 'Recent'}</span></h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" className="h-auto p-3 text-[9px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary/80 transition-all rounded-[1rem] bg-primary/5 shadow-inner italic" onClick={() => markAllAsRead()}>
                            PURGE ALL
                        </Button>
                    )}
                </div>
                <NotificationList
                    notifications={notifications}
                    onMarkAsRead={markAsRead}
                    onItemClick={(notification) => {
                        if (notification.actionUrl) {
                            router.push(notification.actionUrl);
                            setOpen(false);
                        }
                    }}
                />
                <div className="p-8 border-t border-white/5 bg-background/40">
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.3em] h-14 hover:bg-primary/10 rounded-[1.5rem] transition-all border border-white/5 shadow-2xl shadow-black/20 italic" onClick={() => {
                        router.push('/dashboard/notifications');
                        setOpen(false);
                    }}>
                        {unreadCount > 0 ? 'ACCESS INTEL COMMAND' : 'VIEW HISTORY LOGS'}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
