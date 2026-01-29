// app/api/notifications/send/route.ts - REFACTORED to use infrastructure logger

import { NextResponse } from 'next/server';
import { sendServerEmail } from '@/lib/server-email';
import { logger } from '@/infrastructure/logger';

export const dynamic = 'force-dynamic';

/**
 * Send email notification
 * ✅ REFACTORED: Uses centralized logger
 */
export async function POST(req: Request) {
    try {
        const { to, subject, text, html } = await req.json();

        if (!to || !subject || !text) {
            return NextResponse.json({
                error: 'Missing required fields: to, subject, text'
            }, { status: 400 });
        }

        // Send email
        const result = await sendServerEmail(to, subject, text, html);

        logger.info('Email notification sent', { to, subject });

        return NextResponse.json(result);

    } catch (error: any) {
        logger.error('Notification send failed', error, { metadata: { to: req.body } });
        return NextResponse.json({
            error: error.message || 'Failed to send notification'
        }, { status: 500 });
    }
}
