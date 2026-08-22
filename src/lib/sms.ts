import { getAdminDb } from '@/infrastructure/firebase/admin';

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string; provider?: string }> {
    try {
        const db = getAdminDb();
        
        // 1. Fetch SMS configuration from platform settings
        const settingsDoc = await db.collection('platform_settings').doc('notifications').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : null;

        const isSmsEnabled = settings?.isSmsEnabled ?? true;
        if (!isSmsEnabled) {
            return { success: false, error: 'SMS globally disabled' };
        }

        const provider = settings?.smsProvider || 'mock'; // 'msg91', 'twilio', 'mock'
        const apiKey = settings?.smsApiKey || '';
        const senderId = settings?.smsSenderId || 'TM4JOB';

        // Ensure number is properly formatted (E.164 without + for some providers, or with + for twilio)
        // This is a stub implementation. Real implementation goes here based on selected provider.
        if (provider === 'msg91') {
            // MSG91 implementation example:
            // await fetch(`https://control.msg91.com/api/v5/flow/`, { method: 'POST', headers: { authkey: apiKey }, body: ... })
            return { success: true, provider: 'msg91' };
        } else if (provider === 'twilio') {
            // Twilio implementation example:
            return { success: true, provider: 'twilio' };
        } else {
            // Mock / Local logging
            return { success: true, provider: 'mock' };
        }
    } catch (error: any) {
        console.error('[SMS] Error sending SMS:', error);
        return { success: false, error: error.message };
    }
}
