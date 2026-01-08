// import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Temporarily disabled for Firebase deployment compatibility
}

export const onRequestError = async (err: any) => {
  // No-op for now
  console.error("Request Error:", err);
};
