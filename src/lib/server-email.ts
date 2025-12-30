
import { NextResponse } from 'next/server';

export async function sendServerEmail(to: string, subject: string, text: string, html?: string) {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        console.warn("BREVO_API_KEY is missing. Email skipped (Mock Mode).");
        return { success: true, mocked: true };
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'CCTV Job Connect', email: 'noreply@cctvjobconnect.com' },
                to: [{ email: to }],
                subject: subject,
                textContent: text,
                htmlContent: html || text
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Brevo API Error:", errorData);
            throw new Error(`Email failed: ${JSON.stringify(errorData)}`);
        }

        return { success: true };
    } catch (error) {
        console.error("ServerEmail Error:", error);
        throw error;
    }
}
