
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const isE2eAllowed = () => {
    const emulatorEnabled =
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
        process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

    if (emulatorEnabled) return true;
    if (process.env.ALLOW_E2E_SEED === 'true') return true;
    return process.env.NODE_ENV !== 'production';
};

// Paths that do not require authentication (public APIs)
const PUBLIC_PATHS = [
    '/api/auth/session',
    '/api/cashfree/webhook',
    '/api/test-email', // Email testing endpoint
    ...(isE2eAllowed() ? ['/api/e2e'] : []),
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
        // Bypass rate limiting in E2E mode to prevent flakiness
        console.log(`[Proxy] Checking rate limit for ${ip} on ${pathname}. E2E Allowed: ${isE2eAllowed()}`);
        if (!isE2eAllowed()) {
            await limiter.check(20, ip + pathname);
        }
    } catch (e) {
        // Rate Limited
        console.warn(`[Proxy] RATE LIMITED (429): ${ip} on ${pathname}. E2E Allowed: ${isE2eAllowed()}`);
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
