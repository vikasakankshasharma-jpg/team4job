import { sendServerEmail } from '@/lib/server-email';
import { sendWhatsAppText, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getAdminMessaging, getAdminDb } from '@/infrastructure/firebase/admin';
import { sendSMS } from '@/lib/sms';

export interface SendNotificationPayload {
    to: string;
    subject: string;
    text: string;
    html?: string;
    phoneNumber?: string;
    templateName?: string;
    templateVariables?: any[];
    fcmTokens?: string[];
    userId?: string;
    useEscalation?: boolean;
    channel?: 'email' | 'whatsapp' | 'both';
}

export const notificationService = {
    async sendNotificationEscalated(payload: SendNotificationPayload) {
        const { to, subject, text, html, phoneNumber, templateName, templateVariables, fcmTokens = [], userId, useEscalation = false } = payload;
        
        if (!to || !subject || !text) {
            throw new Error('Missing required fields: to, subject, text');
        }

        const db = getAdminDb();
        const results: any = { push: null, whatsapp: null, email: null, sms: null, escalatedTo: null };

        // 1. Fetch Global Admin Settings
        const settingsDoc = await db.collection('platform_settings').doc('notifications').get();
        const globalSettings = settingsDoc.exists ? settingsDoc.data() : null;
        
        const isEmailEnabledGlobally = globalSettings?.isEmailEnabled ?? true;
        const isPushEnabledGlobally = globalSettings?.isPushEnabled ?? true;
        const isSmsEnabledGlobally = globalSettings?.isSmsEnabled ?? true;

        // 2. Fetch User Preferences (if userId is provided)
        let userPrefs: any = null;
        if (userId) {
            const prefsDoc = await db.collection('notification_preferences').doc(userId).get();
            if (prefsDoc.exists) {
                userPrefs = prefsDoc.data();
            }
        }

        // Default to ALL on if no preferences found (Opt-out model)
        const userWantsPush = userPrefs?.channels?.inApp !== false;
        const userWantsEmail = userPrefs?.channels?.email !== false;
        const userWantsSms = userPrefs?.channels?.sms !== false;
        
        // We will define whatsapp preference based on SMS for now, or default true
        const userWantsWhatsapp = userPrefs?.channels?.whatsapp !== false;

        const sendEmail = async () => {
            if (!isEmailEnabledGlobally || !userWantsEmail) return;
            try {
                results.email = await sendServerEmail(to, subject, text, html);
                if (!results.escalatedTo) results.escalatedTo = 'email';
            } catch (err: any) {
                console.warn("[Email] Failed:", err.message);
            }
        };

        const sendSmsMessage = async () => {
            if (!isSmsEnabledGlobally || !userWantsSms || !phoneNumber) return;
            try {
                results.sms = await sendSMS(phoneNumber, text);
                if (!results.escalatedTo && results.sms?.success) results.escalatedTo = 'sms';
            } catch (err: any) {
                console.warn("[SMS] Failed:", err.message);
            }
        }

        // Tier 1: FCM Push Notifications (Free & Instant)
        if (isPushEnabledGlobally && userWantsPush && fcmTokens.length > 0) {
            try {
                const messaging = getAdminMessaging();
                const pushResult = await messaging.sendEachForMulticast({
                    tokens: fcmTokens,
                    notification: { title: subject, body: text }
                });
                results.push = pushResult;
                if (pushResult.successCount > 0) results.escalatedTo = 'push';
            } catch (err: any) {
                console.warn("[FCM] Push failed:", err.message);
            }
        }

        // Tier 2 & 3: WhatsApp
        if (phoneNumber && userId && userWantsWhatsapp) {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const lastWaInteraction = userData?.lastWhatsappInteraction?.toDate() || new Date(0);
            const isWithin24h = (Date.now() - lastWaInteraction.getTime()) < (24 * 60 * 60 * 1000);

            if (isWithin24h) {
                results.whatsapp = await sendWhatsAppText(phoneNumber, text);
                if (results.whatsapp?.success && !results.escalatedTo) results.escalatedTo = 'whatsapp_raw';
            } else if (templateName) {
                results.whatsapp = await sendWhatsAppTemplate(phoneNumber, templateName, templateVariables || [], 'en');
                if (results.whatsapp?.success && !results.escalatedTo) results.escalatedTo = 'whatsapp_template';
            }
        }

        // Tier 4: SMS
        await sendSmsMessage();

        // Tier 5: Fallback to Email
        await sendEmail();
        
        return results;
    }
};
