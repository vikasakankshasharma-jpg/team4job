import { sendServerEmail } from '@/lib/server-email';
import { sendWhatsAppText, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getAdminMessaging, getAdminDb } from '@/infrastructure/firebase/admin';

export interface SendNotificationPayload {
    to: string;
    subject: string;
    text: string;
    html?: string;
    phoneNumber?: string;
    templateName?: string;
    templateVariables?: string[];
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

        const results: any = { push: null, whatsapp: null, email: null, escalatedTo: null };

        const sendEmailFallback = async () => {
            try {
                results.email = await sendServerEmail(to, subject, text, html);
                results.escalatedTo = 'email';
            } catch (err: any) {
                console.warn("[Email] Failed:", err.message);
            }
        };

        if (!useEscalation) {
            const channel = payload.channel || 'email';
            if (channel === 'email' || channel === 'both') await sendEmailFallback();
            if ((channel === 'whatsapp' || channel === 'both') && phoneNumber) {
                if (templateName) results.whatsapp = await sendWhatsAppTemplate(phoneNumber, templateName, templateVariables || [], 'en');
                else results.whatsapp = await sendWhatsAppText(phoneNumber, text);
            }
            return results;
        }

        // --- ESCALATION WATERFALL ---

        // Tier 1: FCM Push Notifications (Free & Instant)
        if (fcmTokens.length > 0) {
            try {
                const messaging = getAdminMessaging();
                const pushResult = await messaging.sendEachForMulticast({
                    tokens: fcmTokens,
                    notification: { title: subject, body: text }
                });
                results.push = pushResult;
                
                if (pushResult.successCount > 0) {
                    results.escalatedTo = 'push';
                    return results;
                }
            } catch (err: any) {
                console.warn("[FCM] Push failed:", err.message);
            }
        }

        // Tier 2 & 3: WhatsApp (24h Window Check or Template)
        if (phoneNumber && userId) {
            const db = getAdminDb();
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            const lastWaInteraction = userData?.lastWhatsappInteraction?.toDate() || new Date(0);
            const isWithin24h = (Date.now() - lastWaInteraction.getTime()) < (24 * 60 * 60 * 1000);

            if (isWithin24h) {
                // Tier 2: Free 24-hour Raw Text
                results.whatsapp = await sendWhatsAppText(phoneNumber, text);
                if (results.whatsapp?.success) {
                    results.escalatedTo = 'whatsapp_raw';
                    return results;
                }
            } else if (templateName) {
                // Tier 3: Paid Template (Utility)
                results.whatsapp = await sendWhatsAppTemplate(phoneNumber, templateName, templateVariables || [], 'en');
                if (results.whatsapp?.success) {
                    results.escalatedTo = 'whatsapp_template';
                    return results;
                }
            }
        }

        // Tier 4: Fallback to Email
        await sendEmailFallback();
        
        return results;
    }
};
