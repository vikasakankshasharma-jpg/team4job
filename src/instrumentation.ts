import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Temporarily disabled for Firebase deployment compatibility
  // Sentry instrumentation causes "require-in-the-middle" module errors
  // Re-enable after confirming Firebase + Sentry compatibility

  // if (process.env.NEXT_RUNTIME === "nodejs") {
  //   await import("../sentry.server.config");
  // }

  // if (process.env.NEXT_RUNTIME === "edge") {
  //   await import("../sentry.edge.config");
  // }
}

export const onRequestError = Sentry.captureRequestError;
