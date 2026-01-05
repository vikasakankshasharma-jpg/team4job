
export async function sendNotification(
    to: string,
    subject: string,
    text: string,
    html?: string
) {
    try {
        const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, subject, text, html }),
        });

        if (!response.ok) {
            console.error("Failed to send notification via API proxy");
        }
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}
