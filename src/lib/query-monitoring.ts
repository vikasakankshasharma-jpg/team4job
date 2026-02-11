// lib/query-monitoring.ts
/**
 * Database query performance monitoring utilities
 * Tracks query performance and detects scaling issues
 */

export interface QueryMetrics {
    queryName: string;
    startTime: number;
    endTime: number;
    duration: number;
    docCount: number;
    success: boolean;
    error?: string;
}

/**
 * Track query performance and log warnings for slow queries
 */
export function trackQueryPerformance(
    queryName: string,
    startTime: number,
    docCount: number,
    error?: Error
): QueryMetrics {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metrics: QueryMetrics = {
        queryName,
        startTime,
        endTime,
        duration,
        docCount,
        success: !error,
        error: error?.message,
    };

    // Log slow queries (>1 second)
    if (duration > 1000) {
        console.warn(`[SLOW QUERY] ${queryName} took ${duration}ms for ${docCount} documents`);
    }

    // Alert on large fetches (>100 documents)
    if (docCount > 100) {
        console.warn(`[LARGE FETCH] ${queryName} fetched ${docCount} documents`);
    }

    // Log errors
    if (error) {
        console.error(`[QUERY ERROR] ${queryName} failed:`, error);
    }

    return metrics;
}

/**
 * Higher-order function to wrap repository methods with performance tracking
 */
export function withQueryTracking<T extends any[]>(
    queryName: string,
    fn: () => Promise<T>
): () => Promise<T> {
    return async () => {
        const startTime = Date.now();
        try {
            const result = await fn();
            trackQueryPerformance(queryName, startTime, result.length);
            return result;
        } catch (error) {
            trackQueryPerformance(queryName, startTime, 0, error as Error);
            throw error;
        }
    };
}
