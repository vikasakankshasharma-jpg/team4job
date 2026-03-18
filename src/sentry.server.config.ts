import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';
const isCI = process.env.NEXT_PUBLIC_IS_CI;

if (isCI !== 'true' && isCI !== '1' && isCI?.trim() !== 'true') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    debug: false,
  });
}
