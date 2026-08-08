// Helper to get environment variables securely
const getWhatsAppConfig = () => {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!token || !phoneNumberId) {
        console.warn("WhatsApp API credentials missing from environment variables.");
    }
    
    return { token, phoneNumberId };
};

export interface WhatsAppTemplateComponent {
    type: "header" | "body" | "button";
    parameters: Array<{
        type: "text" | "currency" | "date_time" | "document" | "image" | "video";
        text?: string;
        // other types omitted for brevity
    }>;
}

/**
 * Send a raw text message via WhatsApp.
 * Warning: This will FAIL if it has been >24 hours since the user last messaged you.
 */
export async function sendWhatsAppText(to: string, message: string) {
    const { token, phoneNumberId } = getWhatsAppConfig();
    if (!token || !phoneNumberId) return { success: false, error: "Missing config" };

    const formattedTo = to.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
        type: "text",
        text: {
            preview_url: false,
            body: message
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error(`WhatsApp API Error (Text):`, JSON.stringify(data));
            return { success: false, error: data.error?.message || 'Failed to send WhatsApp message' };
        }

        console.info(`WhatsApp text sent successfully to ${formattedTo}`);
        return { success: true, messageId: data.messages[0].id };
    } catch (error: any) {
        console.error("Exception in sendWhatsAppText:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a pre-approved Meta Utility Template.
 * This can bypass the 24-hour window restriction but costs money.
 */
export async function sendWhatsAppTemplate(to: string, templateName: string, components: WhatsAppTemplateComponent[] = [], languageCode: string = 'en') {
    const { token, phoneNumberId } = getWhatsAppConfig();
    if (!token || !phoneNumberId) return { success: false, error: "Missing config" };

    const formattedTo = to.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
            components: components
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error(`WhatsApp API Error (Template):`, JSON.stringify(data));
            return { success: false, error: data.error?.message || 'Failed to send WhatsApp template' };
        }

        console.info(`WhatsApp template '${templateName}' sent successfully to ${formattedTo}`);
        return { success: true, messageId: data.messages[0].id };
    } catch (error: any) {
        console.error("Exception in sendWhatsAppTemplate:", error.message);
        return { success: false, error: error.message };
    }
}
