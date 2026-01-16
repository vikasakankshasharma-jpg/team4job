import {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    Timestamp,
    addDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Notification, NotificationPreferences, NotificationType } from '@/lib/types';

const NOTIFICATIONS_COLLECTION = 'notifications';
const PREFERENCES_COLLECTION = 'notificationPreferences';

export const NotificationsService = {

    /**
     * Subscribe to real-time notifications for a user
     */
    subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void, onError?: (error: any) => void) {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));

            callback(notifications);
        }, (error) => {
            console.error("[NotificationsService] Subscription error:", error);
            if (onError) onError(error);
        });
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId: string) {
        const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(ref, { read: true });
    },

    /**
     * Mark all notifications for a user as read
     */
    async markAllAsRead(userId: string) {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
    },

    /**
     * Create a new notification (Testing/Internal use)
     */
    async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            ...notification,
            read: false,
            createdAt: Timestamp.now()
        });
    },

    /**
     * Get user notification preferences
     */
    async getPreferences(userId: string): Promise<NotificationPreferences> {
        const ref = doc(db, PREFERENCES_COLLECTION, userId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            return snap.data() as NotificationPreferences;
        }

        // Default preferences
        return {
            userId,
            channels: { inApp: true, email: true, sms: false },
            frequency: 'realtime',
            quietHours: { enabled: false, start: '22:00', end: '08:00' },
            categories: {
                bidding: { enabled: true, channels: ['inApp', 'email'] },
                payments: { enabled: true, channels: ['inApp', 'email', 'sms'] },
                communication: { enabled: true, channels: ['inApp', 'email'] },
                deadlines: { enabled: true, channels: ['inApp', 'email', 'sms'] },
            }
        };
    },

    /**
     * Update user notification preferences
     */
    async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>) {
        const ref = doc(db, PREFERENCES_COLLECTION, userId);
        await setDoc(ref, { ...preferences, userId }, { merge: true });
    }
};
