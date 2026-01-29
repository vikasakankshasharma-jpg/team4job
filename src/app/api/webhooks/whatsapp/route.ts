// app/api/webhooks/whatsapp/route.ts - REFACTORED to use infrastructure

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/infrastructure/logger';

export const dynamic = 'force-dynamic';

/**
 * WhatsApp webhook verification and message handling
 * ✅ REFACTORED: Uses infrastructure logger
 */

// Verify Webhook (Handshake)
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            logger.info('WhatsApp webhook verified successfully');
            return new NextResponse(challenge, { status: 200 });
        } else {
            logger.warn('WhatsApp webhook verification failed - invalid token');
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

// Receive Messages
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Log incoming message
        logger.info('WhatsApp message received', { body });

        // TODO: Handle incoming messages
        // e.g., if (body.entry[0].changes[0].value.messages) ...

        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        logger.error('WhatsApp webhook error', error);
        return new NextResponse('Error', { status: 500 });
    }
}
