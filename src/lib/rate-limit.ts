
/**
 * Simple In-Memory Rate Limiter
 * 
 * NOTE: This is a "Best Effort" implementation for a single-instance deployment.
 * In a serverless/edge environment (like Vercel), this memory is NOT shared across
 * lambda instances. For production, use an external store like Redis/Upstash.
 */

import { getAdminDb } from '@/infrastructure/firebase/admin';

interface RateLimitConfig {
    interval: number; // Window size in milliseconds
    uniqueTokenPerInterval: number; // Max unique users per interval
}

export function rateLimit(config: RateLimitConfig) {
    return {
        check: async (limit: number, token: string) => {
            // Bypass rate limiting in E2E mode to prevent flakiness during automated tests
            if (process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NODE_ENV === 'test') {
                return;
            }

            try {
                const db = getAdminDb();
                const sanitizedToken = token.replace(/[^a-zA-Z0-9_-]/g, '_');
                const ref = db.collection('_system_rate_limits').doc(sanitizedToken);

                await db.runTransaction(async (t) => {
                    const doc = await t.get(ref);
                    const now = Date.now();
                    const startWindow = now - config.interval;

                    let timestamps: number[] = doc.exists ? (doc.data()?.timestamps || []) : [];
                    // Filter timestamps within the current sliding window
                    timestamps = timestamps.filter(ts => ts > startWindow);

                    if (timestamps.length >= limit) {
                        throw new Error('Rate limit exceeded');
                    }

                    timestamps.push(now);
                    t.set(ref, { timestamps, updatedAt: now }, { merge: true });
                });
            } catch (error: any) {
                if (error.message === 'Rate limit exceeded') {
                    throw error;
                }
                // If Firestore fails (e.g. timeout), allow request to pass rather than blocking legitimate traffic
                console.warn('[RateLimit] Distributed check failed, bypassing:', error);
            }
        },
    };
}
