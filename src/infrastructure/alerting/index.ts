// infrastructure/alerting/index.ts

import { logger } from '../logger';

/**
 * Service to send critical alerts to a Discord Webhook.
 */
export class AlertingService {
    private webhookUrl: string | undefined;

    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    }

    /**
     * Send a critical alert to the configured webhook
     */
    async sendCriticalAlert(title: string, description: string, metadata?: Record<string, any>) {
        if (!this.webhookUrl) {
            logger.warn('Webhook URL not configured. Skipping alert.', { title });
            return;
        }

        try {
            const payload = {
                embeds: [
                    {
                        title: `🚨 CRITICAL ALERT: ${title}`,
                        description,
                        color: 16711680, // Red color
                        timestamp: new Date().toISOString(),
                        fields: metadata
                            ? Object.entries(metadata).map(([key, value]) => ({
                                  name: key,
                                  value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                                  inline: true,
                              }))
                            : [],
                    },
                ],
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                logger.error(`Failed to send webhook alert: ${response.statusText}`, null, { status: response.status });
            }
        } catch (error) {
            logger.error('Exception while sending webhook alert', error);
        }
    }
}

export const alertingService = new AlertingService();
