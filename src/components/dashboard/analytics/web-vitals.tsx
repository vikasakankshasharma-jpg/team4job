"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitalsReporter() {
    useReportWebVitals((metric) => {
        const { id, name, label, value } = metric;

        // Log to console in development
        if (process.env.NODE_ENV === "development") {
            console.log(metric);
        }

        // Send to Google Analytics
        if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag('event', name, {
                event_category: label === 'web-vital' ? 'Web Vitals' : 'Next.js Custom Metric',
                value: Math.round(name === 'CLS' ? value * 1000 : value), // Google Analytics requires integers
                event_label: id, // id unique to current page load
                non_interaction: true, // avoids affecting bounce rate
            });
        }
    });

    return null;
}
