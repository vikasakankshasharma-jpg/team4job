import { NextResponse } from 'next/server';
import { sendServerEmail } from '@/lib/server-email';

export async function POST(req: Request) {
    try {
        const { to, subject, text, html } = await req.json();

        if (!to || !subject || !text) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await sendServerEmail(to, subject, text, html);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Notification API Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
