
import { NextResponse } from 'next/server';

export async function sendServerEmail(to: string, subject: string, text: string, html?: string) {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        return { success: true, mocked: true };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.error(`[sendServerEmail] Email sending to ${to} timed out after 10 seconds.`);
        }, 10000); // 10s timeout

        console.log(`[sendServerEmail] Attempting to send email to ${to} with subject: "${subject}"`);

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Team4Job', email: 'noreply@team4job.com' },
                to: [{ email: to }],
                subject: subject,
                textContent: text,
                htmlContent: html || text
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`[sendServerEmail] Failed to send email to ${to}. Status: ${response.status}, Error: ${JSON.stringify(errorData)}`);
            throw new Error(`Email failed: ${JSON.stringify(errorData)}`);
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
}
