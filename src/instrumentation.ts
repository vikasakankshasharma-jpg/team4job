import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Temporarily disabled Sentry for audit stability
  /*
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
  */
}

export const onRequestError = async (err: any) => {
  // Sentry.captureException(err); // Disabled to prevent memory leaks when Sentry is not initialized
};
