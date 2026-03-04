/**
 * Google Analytics Integration
 * Provides utilities for tracking page views and custom events
 */

import { logger } from "@/infrastructure/logger";

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

export type FunnelEventName =
    | 'cta_click'
    | 'signup_started'
    | 'signup_completed';

export interface FunnelProperties {
    source?: string;
    role?: string;
    [key: string]: any;
}

// Track page views
export const pageview = (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_TRACKING_ID, {
            page_path: url,
        });
        logger.debug('[ANALYTICS] Pageview recorded', { url });
    }
};

// Track custom events
export const event = ({
    action,
    category,
    label,
    value,
}: {
    action: string;
    category: string;
    label: string;
    value?: number;
}) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        });
        logger.debug('[ANALYTICS] Event recorded', { action, category, label, value });
    }
};

// Track Funnel Actions
export const trackFunnelEvent = (eventName: FunnelEventName, properties?: FunnelProperties) => {
    logger.info(`[TELEMETRY] Funnel Event: ${eventName}`, properties);

    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, {
            event_category: 'Funnel',
            ...properties
        });
    }
};

// Track specific business events
export const trackJobPosted = (jobId: string, category: string) => {
    event({
        action: 'job_posted',
        category: 'Job',
        label: `${category} - ${jobId}`,
    });
};

export const trackBidPlaced = (jobId: string, bidAmount: number) => {
    event({
        action: 'bid_placed',
        category: 'Bid',
        label: jobId,
        value: bidAmount,
    });
};

export const trackJobAwarded = (jobId: string, amount: number) => {
    event({
        action: 'job_awarded',
        category: 'Job',
        label: jobId,
        value: amount,
    });
};

export const trackPaymentCompleted = (transactionId: string, amount: number) => {
    event({
        action: 'payment_completed',
        category: 'Payment',
        label: transactionId,
        value: amount,
    });
};

export const trackJobCompleted = (jobId: string) => {
    event({
        action: 'job_completed',
        category: 'Job',
        label: jobId,
    });
};

// Extend Window interface for TypeScript
declare global {
    interface Window {
        gtag: (
            command: string,
            targetId: string,
            config?: Record<string, unknown>
        ) => void;
    }
}
