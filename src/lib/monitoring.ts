/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals and reports to analytics
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';
import { event } from './analytics';

function sendToAnalytics(metric: Metric) {
    // Send to Google Analytics
    event({
        action: metric.name,
        category: 'Web Vitals',
        label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log('Web Vital:', metric);
    }
}

export function reportWebVitals() {
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
}
