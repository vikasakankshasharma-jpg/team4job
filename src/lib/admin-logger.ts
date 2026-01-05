import { db } from '@/lib/firebase/server-init';

export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export async function logAdminAlert(level: AlertLevel, message: string, metadata: Record<string, any> = {}) {
    try {
        await db.collection('admin_alerts').add({
            level,
            message,
            metadata,
            timestamp: new Date(),
            read: false,
        });
        console.log(`[AdminAlert] [${level}] ${message}`, metadata);

        // Critical/High-Priority Alerts: Send Email via Notification Service
        if (level === 'CRITICAL' || level === 'WARNING') {
            const settingsSnap = await db.collection('platform_settings').doc('config').get();
            const adminEmail = settingsSnap.exists ? settingsSnap.data()?.adminEmail : null;

            if (adminEmail) {
                // Importing notification service dynamically to avoid circular deps if any
                const { sendNotification } = require('./notifications');
                await sendNotification(
                    adminEmail,
                    `[DoDo Admin] ${level}: ${message.substring(0, 50)}...`,
                    `A new critical alert was logged:\n\nMessage: ${message}\nLevel: ${level}\nTime: ${new Date().toLocaleString()}\n\nCheck dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin`
                );
            }
        }
    } catch (error) {
        console.error('Failed to log admin alert:', error);
    }
}
