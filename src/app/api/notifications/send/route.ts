import { NextResponse } from 'next/server';
import { notificationService, SendNotificationPayload } from '@/domains/notifications/notification.service';

export const dynamic = 'force-dynamic';

/**
 * Send notification using Escalation Waterfall (Push -> WhatsApp Text -> WhatsApp Template -> Email)
 */
export async function POST(req: Request) {
    try {
        const payload: SendNotificationPayload = await req.json();
        
        if (!payload.to || !payload.subject || !payload.text) {
            return NextResponse.json({ error: 'Missing required fields: to, subject, text' }, { status: 400 });
        }

        const results = await notificationService.sendNotificationEscalated(payload);
        return NextResponse.json(results);

    } catch (error: any) {
        return NextResponse.json({
            error: error.message || 'Failed to send notification'
        }, { status: 500 });
    }
}
