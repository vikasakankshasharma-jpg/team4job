import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications'; // Assuming hook path
import { NotificationList } from './notification-list';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleCreateTestNotification = () => {
        // For demo purposes only - hidden feature
        // NotificationsService.createNotification({ ... })
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0 shadow-lg" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => markAllAsRead()}>
                            Mark all as read
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
                <div className="p-2 border-t text-center">
                    <Button variant="ghost" className="w-full text-xs h-8" onClick={() => {
                        router.push('/dashboard/notifications');
                        setOpen(false);
                    }}>
                        View all notifications
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
