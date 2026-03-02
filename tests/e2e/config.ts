// Shared configuration for E2E tests
// Threshold values are relaxed in CI to account for noisy runners.
export const THRESHOLD_MS = process.env.CI ? 15000 : 5000;

// Horizontal scroll tolerance in pixels. 2px is sufficient locally, but CI uses 20px.
export const HORIZONTAL_SCROLL_TOLERANCE = process.env.CI ? 20 : 2;
