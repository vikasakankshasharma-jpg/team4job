import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    environment: process.env.NODE_ENV,

    // Filter out sensitive data
    beforeSend(event, hint) {
        // Don't send events in development
        if (process.env.NODE_ENV === 'development') {
            return null;
        }

        // Filter out personal information
        if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
        }

        return event;
    },
});
