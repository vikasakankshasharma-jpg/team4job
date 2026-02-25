import { NextResponse } from 'next/server';

/**
 * Basic health check endpoint for uptime monitoring services.
 * Returns 200 OK to indicate the application server is running.
 */
export async function GET() {
    return NextResponse.json(
        {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        },
        { status: 200 }
    );
}
