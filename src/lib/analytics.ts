/**
 * Google Analytics Integration
 * Provides utilities for tracking page views and custom events
 */

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Track page views
export const pageview = (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_TRACKING_ID, {
            page_path: url,
        });
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
