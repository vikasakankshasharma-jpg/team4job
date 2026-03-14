// app/api/notifications/send/route.ts - REFACTORED to use infrastructure logger

import { NextResponse } from 'next/server';
import { sendServerEmail } from '@/lib/server-email';


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



        return NextResponse.json(result);

    } catch (error: any) {

        return NextResponse.json({
            error: error.message || 'Failed to send notification'
        }, { status: 500 });
    }
}
