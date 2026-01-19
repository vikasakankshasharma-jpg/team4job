import { env } from "process";

const GRAPH_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface WhatsAppMessage {
    messaging_product: "whatsapp";
    to: string;
    type: "template" | "text";
    template?: {
        name: string;
        language: {
            code: string;
        };
        components?: any[];
    };
    text?: {
        body: string;
        preview_url?: boolean;
    };
}

/**
 * Sends a WhatsApp message via Meta Cloud API
 * @param to Phone number with country code (e.g., "919876543210")
 * @param templateName Name of the pre-approved template
 * @param variables Array of variables for the template body {{1}}, {{2}}...
 * @param language Language code (default: en)
 */
export async function sendWhatsAppTemplate(
    to: string,
    templateName: string,
    variables: string[] = [],
    language: string = "en"
) {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
        console.warn("WhatsApp credentials not found. Message skipped.");
        return { success: false, error: "Missing credentials" };
    }

    // Format variables for Meta API
    const parameters = variables.map((variable) => ({
        type: "text",
        text: variable,
    }));

    const payload: WhatsAppMessage = {
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: language,
            },
            components: [
                {
                    type: "body",
                    parameters: parameters,
                },
            ],
        },
    };

    try {
        const response = await fetch(`${BASE_URL}/${phoneId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("WhatsApp API Error:", data);
            return { success: false, error: data };
        }

        return { success: true, data };
    } catch (error) {
        console.error("WhatsApp Send Failed:", error);
        return { success: false, error };
    }
}

/**
 * Sends a free-form text message (Only allowed within 24h service window)
 */
export async function sendWhatsAppText(to: string, message: string) {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) return;

    const payload: WhatsAppMessage = {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
            body: message,
        },
    };

    try {
        await fetch(`${BASE_URL}/${phoneId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("WhatsApp Text Failed:", error);
    }
}
