// app/api/notifications/send/route.ts - REFACTORED to use infrastructure logger and dual-channel

import { NextResponse } from 'next/server';
import { sendServerEmail } from '@/lib/server-email';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';

import { getAdminMessaging, getAdminDb } from '@/infrastructure/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Send notification using Escalation Waterfall (Push -> WhatsApp Text -> WhatsApp Template -> Email)
 */
export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { to, subject, text, html, phoneNumber, templateName, templateVariables, fcmTokens = [], userId, useEscalation = false } = payload;

        if (!to || !subject || !text) {
            return NextResponse.json({ error: 'Missing required fields: to, subject, text' }, { status: 400 });
        }

        const results: any = { push: null, whatsapp: null, email: null, escalatedTo: null };

        // Helper to send email as absolute fallback or primary choice
        const sendEmailFallback = async () => {
            results.email = await sendServerEmail(to, subject, text, html);
            results.escalatedTo = 'email';
        };

        if (!useEscalation) {
            // Standard explicit delivery without waterfall logic
            const channel = payload.channel || 'email';
            if (channel === 'email' || channel === 'both') await sendEmailFallback();
            if ((channel === 'whatsapp' || channel === 'both') && phoneNumber) {
                if (templateName) results.whatsapp = await sendWhatsAppTemplate(phoneNumber, templateName, 'en', templateVariables || []);
                else results.whatsapp = await sendWhatsAppMessage(phoneNumber, text);
            }
            return NextResponse.json(results);
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
                
                // If at least one device received the push, we consider Tier 1 successful.
                // In a production delayed-escalation flow, we'd wait 5 mins here via a background task.
                if (pushResult.successCount > 0) {
                    results.escalatedTo = 'push';
                    return NextResponse.json(results);
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
                results.whatsapp = await sendWhatsAppMessage(phoneNumber, text);
                if (results.whatsapp?.success) {
                    results.escalatedTo = 'whatsapp_raw';
                    return NextResponse.json(results);
                }
            } else if (templateName) {
                // Tier 3: Paid Template (Utility)
                results.whatsapp = await sendWhatsAppTemplate(phoneNumber, templateName, 'en', templateVariables || []);
                if (results.whatsapp?.success) {
                    results.escalatedTo = 'whatsapp_template';
                    return NextResponse.json(results);
                }
            }
        }

        // Tier 4: Fallback to Email
        await sendEmailFallback();
        
        return NextResponse.json(results);

    } catch (error: any) {
        return NextResponse.json({
            error: error.message || 'Failed to send notification'
        }, { status: 500 });
    }
}
