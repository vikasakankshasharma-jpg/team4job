
export async function sendNotification(
    to: string,
    subject: string,
    text: string,
    html?: string,
    options?: {
        channel?: 'email' | 'whatsapp' | 'both';
        phoneNumber?: string;
        templateName?: string;
        templateVariables?: any[];
        fcmTokens?: string[];
        userId?: string;
        useEscalation?: boolean;
    }
) {
    try {
        const payload = {
            to,
            subject,
            text,
            html,
            ...(options || {})
        };

        const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Proxy failed
        }
    } catch (error) {
        // Notification failed
    }
}
