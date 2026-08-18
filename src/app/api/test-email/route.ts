// app/api/test-email/route.ts - REFACTORED to use infrastructure

import { sendServerEmail } from '@/lib/server-email';

import { NextRequest, NextResponse } from 'next/server';

const isE2eAllowed = () => {
    return process.env.NEXT_PUBLIC_E2E === 'true' && process.env.ALLOW_E2E_SEED === 'true';
};

/**
 * Test endpoint to verify email functionality
 * GET /api/test-email?to=test@example.com
 * ✅ REFACTORED: Uses infrastructure logger
 */
export async function GET(request: NextRequest) {
    if (!isE2eAllowed()) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const to = searchParams.get('to');

        if (!to) {
            return NextResponse.json(
                { error: 'Missing "to" parameter' },
                { status: 400 }
            );
        }

        // Send test email
        const result = await sendServerEmail(
            to,
            'Test Email from Team4Job',
            'This is a test email to verify the email notification system is working correctly.',
            `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2563eb;">Team4Job Email Test</h2>
            <p>This is a test email to verify the email notification system is working correctly.</p>
            <p><strong>Status:</strong> ✅ Email system operational</p>
            <hr>
            <p style="color: #6b7280; font-size: 12px;">Sent from Team4Job Platform</p>
          </body>
        </html>
      `
        );



        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
            to,
            result,
        });
    } catch (error) {

        return NextResponse.json(
            {
                error: 'Failed to send test email',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
