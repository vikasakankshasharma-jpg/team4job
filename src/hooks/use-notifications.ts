import { useState, useEffect, useCallback } from 'react';
import { useUser } from './use-user'; // Assuming this hook exists
import { NotificationsService } from '@/lib/api/notifications';
import { Notification, NotificationPreferences } from '@/lib/types';

export function useNotifications() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

    // Disable realtime notifications in E2E mode to prevent Firestore assertion errors
    const isE2EMode = process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NEXT_PUBLIC_E2E_MODE === 'true';

    useEffect(() => {
        if (!user || !user.id || isE2EMode) {
            const timer = setTimeout(() => {
                setNotifications([]);
                setLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        // 1. Subscribe to real-time notifications try-catch
        let unsubscribe = () => {};
        try {
            unsubscribe = NotificationsService.subscribeToNotifications(
                user.id,
                (newNotifications) => {
                    setNotifications(newNotifications);
                    setLoading(false);
                },
                (error) => {
                    console.error("[useNotifications] Subscription error:", error);
                    setLoading(false);
                }
            );
        } catch (e) {
            console.error("[useNotifications] Failed to setup subscription:", e);
            setLoading(false);
        }

        // 2. Fetch initial preferences
        NotificationsService.getPreferences(user.id).then(setPreferences).catch(() => {});

        return () => unsubscribe();
    }, [user, isE2EMode]);

    const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;

    const markAsRead = useCallback(async (notificationId: string) => {
        // Optimistic update
        setNotifications(prev => Array.isArray(prev) ? prev.map(n => n.id === notificationId ? { ...n, read: true } : n) : []);
        try {
            await NotificationsService.markAsRead(notificationId);
        } catch (_error) {
            // Revert or handle silently
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!user) return;
        const previous = [...notifications];
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await NotificationsService.markAllAsRead(user.id);
        } catch (_error) {
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
