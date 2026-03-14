/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals and reports to analytics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { event } from './analytics';

function sendToAnalytics(metric: Metric) {
    // Send to Google Analytics
    event({
        action: metric.name,
        category: 'Web Vitals',
        label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    });
}

export function reportWebVitals() {
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);
}
