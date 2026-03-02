// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';
const isCI = process.env.NEXT_PUBLIC_IS_CI;

// Only initialize Sentry if NOT in CI/test mode
if (isCI !== 'true' && isCI !== '1' && isCI?.trim() !== 'true') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    replaysOnErrorSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: isProduction ? 0.01 : 0.1,

    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
  });
}

// Action required for Sentry v8 to instrument navigations
export const onRouterTransitionStart = (Sentry as any).captureRouterTransitionStart;
