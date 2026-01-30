
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

// Paths that do not require authentication (public APIs)
const PUBLIC_PATHS = [
    '/api/auth/session',
    '/api/cashfree/webhook',
    '/api/test-email', // Email testing endpoint
];

// Initialize rate limiter: 20 requests per minute per IP
// Note: This is per-container/instance.
const limiter = rateLimit({
    interval: 60 * 1000, // 60 seconds
    uniqueTokenPerInterval: 500, // Max 500 unique IPs per minute
});

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only strictly secure /api routes
    if (!pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Skip public paths from Auth checks, but maybe NOT rate limits?
    // Let's rate limit everything to be safe.

    // 1. Rate Limiting Check
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    try {
        // Limit to 20 requests per minute per IP
        await limiter.check(20, ip + pathname); // Scoping by IP + Path can be safer, or just IP. Let's do IP.
        // Actually, just IP is better for global DOS protection.
        // await limiter.check(50, ip); 
        // Let's be generous for now: 50 req/min
    } catch (e) {
        // Rate Limited
        console.warn(`[RateLimit] Blocked request from ${ip}`);
        return NextResponse.json(
            { error: 'Too Many Requests' },
            { status: 429 }
        );
    }
    // 2. Auth Check
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
             { error: 'Authentication required. Please provide a valid Bearer token.' },
             { status: 401 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
