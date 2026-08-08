// app/api/webhooks/whatsapp/route.ts - REFACTORED to use infrastructure

import { NextRequest, NextResponse } from 'next/server';


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

            return new NextResponse(challenge, { status: 200 });
        } else {

            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

import { getAdminDb } from '@/infrastructure/firebase/admin';

// Receive Messages
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate this is a WhatsApp status/message update
        if (body.object === 'whatsapp_business_account') {
            
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;
                    
                    // Handle Incoming Messages
                    if (value.messages && value.messages.length > 0) {
                        for (const message of value.messages) {
                            const from = message.from;
                            const messageId = message.id;
                            const text = message.type === 'text' ? message.text.body : '[Non-text message]';
                            
                            console.info(`[WhatsApp] Incoming message from ${from}: ${text}`);

                            // Log to Firestore for admin review or chat interface
                            const db = getAdminDb();
                            await db.collection('whatsapp_inbound_logs').doc(messageId).set({
                                from,
                                text,
                                messageId,
                                timestamp: new Date(),
                                status: 'received'
                            });
                        }
                    }

                    // Handle Message Status Updates (Delivered, Read, Failed)
                    if (value.statuses && value.statuses.length > 0) {
                        for (const status of value.statuses) {
                            console.info(`[WhatsApp] Message ${status.id} status updated to: ${status.status}`);
                        }
                    }
                }
            }
        }

        return new NextResponse('OK', { status: 200 });
    } catch (error: any) {
        console.error(`[WhatsApp] Webhook Error: ${error.message}`);
        return new NextResponse('Error', { status: 500 });
    }
}
