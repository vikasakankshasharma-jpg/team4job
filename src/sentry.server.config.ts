import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';
const isCI = process.env.NEXT_PUBLIC_IS_CI;

if (isCI !== 'true' && isCI !== '1' && isCI?.trim() !== 'true') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    debug: false,
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Ignore NEXT_REDIRECT errors
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as any).digest;
        if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
          return null;
        }
      }

      // Ignore 401 Unauthorized errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('Firebase ID token has expired')) {
          return null;
        }
      }

      return event;
    },
  });
}
