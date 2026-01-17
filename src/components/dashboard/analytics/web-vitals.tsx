"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitalsReporter() {
    useReportWebVitals((metric) => {
        // Log to console in development
        if (process.env.NODE_ENV === "development") {
            console.log(metric);
        }

        // In production, this is where you'd send to analytics
        // e.g. window.gtag('event', metric.name, { ... })
    });

    return null;
}
