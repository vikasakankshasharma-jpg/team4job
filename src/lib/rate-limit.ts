
/**
 * Simple In-Memory Rate Limiter
 * 
 * NOTE: This is a "Best Effort" implementation for a single-instance deployment.
 * In a serverless/edge environment (like Vercel), this memory is NOT shared across
 * lambda instances. For production, use an external store like Redis/Upstash.
 */

interface RateLimitConfig {
    interval: number; // Window size in milliseconds
    uniqueTokenPerInterval: number; // Max unique users per interval (to prevent memory leaks)
}

interface RateLimitContext {
    check: (limit: number, token: string) => Promise<void>;
}

export function rateLimit(config: RateLimitConfig) {
    const tokenCache = new Map<string, number[]>();
    let intervalStart = Date.now();

    return {
        check: (limit: number, token: string) =>
            new Promise<void>((resolve, reject) => {
                // Bypass rate limiting in E2E mode to prevent flakiness during automated tests
                if (process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NODE_ENV === 'test') {
                    console.log(`[RateLimit] Bypassing for token: ${token}`);
                    return resolve();
                } else {
                    console.log(`[RateLimit] Checking limit for token: ${token} (E2E: ${process.env.NEXT_PUBLIC_E2E}, ENV: ${process.env.NODE_ENV})`);
                }

                const now = Date.now();

                // Reset interval if needed to prune memory
                if (now - intervalStart > config.interval) {
                    intervalStart = now;
                    tokenCache.clear();
                }

                const timestampHistory = tokenCache.get(token) || [];
                // Filter timestamps within the current sliding window [now - interval, now]
                const startWindow = now - config.interval;
                const windowTimestamps = timestampHistory.filter(timestamp => timestamp > startWindow);

                if (windowTimestamps.length >= limit) {
                    reject(new Error('Rate limit exceeded'));
                } else {
                    windowTimestamps.push(now);
                    tokenCache.set(token, windowTimestamps);
                    resolve();
                }
            }),
    };
}
