import { useState, useEffect, useCallback } from 'react';
import { useUser } from './use-user'; // Assuming this hook exists
import { NotificationsService } from '@/lib/api/notifications';
import { Notification, NotificationPreferences } from '@/lib/types';

export function useNotifications() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        // 1. Subscribe to real-time notifications
        // 1. Subscribe to real-time notifications
        const unsubscribe = NotificationsService.subscribeToNotifications(
            user.id,
            (newNotifications) => {
                setNotifications(newNotifications);
                setLoading(false);
            },
            (error) => {
                setLoading(false);
            }
        );

        // 2. Fetch initial preferences
        NotificationsService.getPreferences(user.id).then(setPreferences);

        return () => unsubscribe();
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = useCallback(async (notificationId: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
        try {
            await NotificationsService.markAsRead(notificationId);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            // Revert if needed, or just let the next snapshot fix it
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!user) return;
        const previous = [...notifications];
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await NotificationsService.markAllAsRead(user.id);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
            setNotifications(previous);
        }
    }, [user, notifications]);

    return {
        notifications,
        unreadCount,
        loading,
        preferences,
        markAsRead,
        markAllAsRead,
        updatePreferences: NotificationsService.updatePreferences
    };
}
